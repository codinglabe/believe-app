<?php

namespace App\Http\Controllers\Organization;

use App\Data\GovernanceFolderStructure;
use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Services\DropboxGovernanceService;
use App\Services\OrganizationOnboardingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class OrganizationStorageController extends Controller
{
    public function __construct(
        private readonly DropboxGovernanceService $governanceService,
        private readonly OrganizationOnboardingService $onboardingService,
    ) {}

    protected function resolveOrg(): Organization
    {
        /** @var \App\Models\User|null $user */
        $user = Auth::user();

        if (! $user) {
            abort(403, 'Unauthenticated.');
        }

        $org = Organization::forAuthUser($user);

        if (! $org) {
            abort(403, 'No organisation linked to your account.');
        }

        return $org;
    }

    public function index(Request $request): Response
    {
        $org = $this->resolveOrg();
        $dropboxConnected = $this->governanceService->isDropboxConnected($org);
        $provisioned = false;
        $folderTree = [];
        $folderFileCounts = [];
        $files = [];
        $searchQuery = trim((string) $request->query('q', ''));
        $searchResults = null;

        $currentPath = GovernanceFolderStructure::normalizePath(
            (string) $request->query('path', GovernanceFolderStructure::rootPath())
        );

        if (! GovernanceFolderStructure::isAllowedPath($currentPath)) {
            $currentPath = GovernanceFolderStructure::rootPath();
        }

        if ($dropboxConnected) {
            $api = $this->governanceService->getApiForOrganization($org);

            if ($api) {
                $provisioned = $this->governanceService->resolveProvisioned($org, $api);
                $org->refresh();

                if ($provisioned) {
                    $folderTree = GovernanceFolderStructure::uiTree();

                    try {
                        $folderFileCounts = $this->governanceService->countDirectFilesPerFolder($api);

                        if ($searchQuery !== '') {
                            $searchResults = $this->governanceService->searchFiles($api, $searchQuery);
                        } else {
                            $files = $this->governanceService->listFiles($api, $currentPath);
                        }
                    } catch (\Throwable $e) {
                        Log::warning('Governance storage list failed', [
                            'organization_id' => $org->id,
                            'path' => $currentPath,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }
            }
        }

        return Inertia::render('Organization/Storage/Index', [
            'dropboxConnected' => $dropboxConnected,
            'provisioned' => $provisioned,
            'currentPath' => $currentPath,
            'rootPath' => GovernanceFolderStructure::rootPath(),
            'folderTree' => $folderTree,
            'folderFileCounts' => $folderFileCounts,
            'files' => $files,
            'searchQuery' => $provisioned ? $searchQuery : '',
            'searchResults' => $provisioned ? $searchResults : null,
            'dropboxConnectUrl' => route('integrations.dropbox.redirect'),
            'integrationsDropboxUrl' => route('integrations.dropbox'),
        ]);
    }

    public function provision(): RedirectResponse
    {
        $org = $this->resolveOrg();

        if (! $this->governanceService->isDropboxConnected($org)) {
            return redirect()->route('governance.storage.index')->with('error', 'Connect Dropbox first to create governance folders.');
        }

        $result = $this->governanceService->provisionFolders($org);

        if ($result['failed'] > 0) {
            return redirect()->route('governance.storage.index')->with(
                'error',
                'Some governance folders could not be created. Please try again.'
            );
        }

        $message = $result['created'] > 0
            ? "Created {$result['created']} governance folder(s) in Dropbox."
            : 'Governance folders are already set up in Dropbox.';

        return redirect()->route('governance.storage.index')->with('success', $message);
    }

    public function upload(Request $request): RedirectResponse|JsonResponse
    {
        @ini_set('memory_limit', '2048M');
        @ini_set('max_execution_time', '7200');

        $org = $this->resolveOrg();

        if (! $this->governanceService->resolveProvisioned($org)) {
            return $this->uploadErrorResponse($request, 'Create governance folders in Dropbox before uploading files.');
        }

        $api = $this->governanceService->getApiForOrganization($org);

        if (! $api) {
            return $this->uploadErrorResponse($request, 'Dropbox is not connected.');
        }

        $folderPath = $this->governanceService->validateGovernancePath(
            (string) $request->input('folder_path', GovernanceFolderStructure::rootPath())
        );

        if ($folderPath === null) {
            return $this->uploadErrorResponse($request, 'Invalid folder.');
        }

        $request->validate([
            'file' => ['required', 'file', 'max:2097152'],
        ]);

        $uploaded = $request->file('file');
        if (! $uploaded instanceof UploadedFile) {
            return $this->uploadErrorResponse($request, 'No file received.');
        }

        $safeName = $this->resolveUploadFileName($request, $uploaded);
        $dropboxPath = $folderPath.'/'.$safeName;
        $localPath = $uploaded->getRealPath();

        if ($localPath === false || ! is_readable($localPath)) {
            return $this->uploadErrorResponse($request, 'Could not read uploaded file.');
        }

        $result = $api->uploadFromLocalPath($dropboxPath, $localPath);

        if ($result === null) {
            return $this->uploadErrorResponse($request, 'Upload to Dropbox failed.');
        }

        if ($request->expectsJson() || $request->ajax()) {
            return response()->json([
                'success' => true,
                'message' => 'File uploaded.',
                'path' => $result['path_display'],
                'name' => $safeName,
            ]);
        }

        return redirect()->route('governance.storage.index', ['path' => $folderPath])->with('success', 'File uploaded.');
    }

    public function download(Request $request): RedirectResponse|SymfonyResponse
    {
        $org = $this->resolveOrg();

        if (! $this->governanceService->resolveProvisioned($org)) {
            return redirect()->route('governance.storage.index')->with('error', 'Create governance folders first.');
        }

        $api = $this->governanceService->getApiForOrganization($org);

        if (! $api) {
            return redirect()->route('governance.storage.index')->with('error', 'Dropbox is not connected.');
        }

        $path = (string) $request->query('path', '');
        $path = GovernanceFolderStructure::normalizePath($path);
        $root = GovernanceFolderStructure::rootPath();

        if ($path === $root || ! str_starts_with($path, $root.'/') || str_contains($path, '..')) {
            return redirect()->route('governance.storage.index')->with('error', 'Invalid file path.');
        }

        $link = $api->getTemporaryLink($path);
        if (! $link) {
            return redirect()->route('governance.storage.index')->with('error', 'Could not generate download link.');
        }

        return redirect()->away($link);
    }

    public function delete(Request $request): RedirectResponse
    {
        $org = $this->resolveOrg();

        if (! $this->governanceService->resolveProvisioned($org)) {
            return back()->with('error', 'Create governance folders first.');
        }

        $api = $this->governanceService->getApiForOrganization($org);

        if (! $api) {
            return back()->with('error', 'Dropbox is not connected.');
        }

        $path = GovernanceFolderStructure::normalizePath((string) $request->input('path', ''));
        $root = GovernanceFolderStructure::rootPath();
        $folderPath = dirname($path);

        if ($path === $root || ! str_starts_with($path, $root.'/') || str_contains($path, '..')) {
            return back()->with('error', 'Invalid file path.');
        }

        if (! $api->deleteFile($path)) {
            return back()->with('error', 'Could not delete file.');
        }

        $revoked = $this->onboardingService->revokeDocumentByStoragePath($org, $path);

        $redirectPath = GovernanceFolderStructure::isAllowedPath($folderPath)
            ? $folderPath
            : GovernanceFolderStructure::rootPath();

        $message = 'File deleted.';
        if ($revoked['revoked'] && filled($revoked['label'])) {
            $message .= ' '.$revoked['label'].' is required again on Governance onboarding.';
        }

        return redirect()->route('governance.storage.index', ['path' => $redirectPath])->with('success', $message);
    }

    public function rename(Request $request): RedirectResponse
    {
        $org = $this->resolveOrg();

        if (! $this->governanceService->resolveProvisioned($org)) {
            return back()->with('error', 'Create governance folders first.');
        }

        $api = $this->governanceService->getApiForOrganization($org);

        if (! $api) {
            return back()->with('error', 'Dropbox is not connected.');
        }

        $path = GovernanceFolderStructure::normalizePath((string) $request->input('path', ''));
        $newName = $this->sanitizeFileName((string) $request->input('new_name', ''));
        $root = GovernanceFolderStructure::rootPath();
        $folderPath = dirname($path);

        if ($path === $root || $newName === '' || ! str_starts_with($path, $root.'/') || str_contains($path, '..')) {
            return back()->with('error', 'Invalid request.');
        }

        $toPath = dirname($path).'/'.$newName;

        if (! $api->moveFile($path, $toPath)) {
            return back()->with('error', 'Could not rename file.');
        }

        $redirectPath = GovernanceFolderStructure::isAllowedPath($folderPath)
            ? $folderPath
            : GovernanceFolderStructure::rootPath();

        return redirect()->route('governance.storage.index', ['path' => $redirectPath])->with('success', 'File renamed.');
    }

    private function sanitizeFileName(string $name): string
    {
        $name = trim($name);
        $name = preg_replace('/[\\\\\/:*?"<>|]+/', ' ', $name) ?? $name;
        $name = trim(preg_replace('/\s+/', ' ', $name) ?? $name);
        $name = trim($name, " \t\n\r\0\x0B.");

        return substr($name !== '' ? $name : 'document', 0, 255);
    }

    private function resolveUploadFileName(Request $request, UploadedFile $uploaded): string
    {
        $originalName = $uploaded->getClientOriginalName();
        $custom = $request->input('file_name');
        $custom = is_string($custom) ? trim($custom) : '';

        if ($custom === '') {
            return $this->sanitizeFileName($originalName);
        }

        $safe = $this->sanitizeFileName($custom);
        $ext = pathinfo($originalName, PATHINFO_EXTENSION);

        if ($ext !== '' && ! preg_match('/\.'.preg_quote($ext, '/').'$/i', $safe)) {
            $safe .= '.'.$ext;
        }

        return $safe;
    }

    private function uploadErrorResponse(Request $request, string $message): RedirectResponse|JsonResponse
    {
        if ($request->expectsJson() || $request->ajax()) {
            return response()->json(['success' => false, 'message' => $message], 422);
        }

        return back()->with('error', $message);
    }
}
