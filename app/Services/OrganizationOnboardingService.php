<?php

namespace App\Services;

use App\Data\GovernanceFolderStructure;
use App\Data\OrganizationOnboardingRequirements;
use App\Models\Organization;
use App\Models\OrganizationOnboardingDocument;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class OrganizationOnboardingService
{
    public function __construct(
        private readonly DropboxGovernanceService $governanceService,
    ) {}

    /**
     * @return array{percent: int, completed: int, total: int, missing: array<int, array<string, mixed>>, completeSetupHref: string|null, items: array<int, array<string, mixed>>}|null
     */
    public function profileCompletionForOrganization(?Organization $organization): ?array
    {
        if (! $organization) {
            return null;
        }

        $items = $this->buildItemsWithStatus($organization);
        $completed = collect($items)->where('connected', true)->count();
        $total = count($items);
        $percent = $total > 0 ? (int) round(($completed / $total) * 100) : 100;
        $missing = collect($items)->where('connected', false)->values()->all();

        return [
            'percent' => $percent,
            'completed' => $completed,
            'total' => $total,
            'missing' => $missing,
            'items' => $items,
            'completeSetupHref' => route('governance.onboarding.index'),
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function buildItemsWithStatus(Organization $organization): array
    {
        $documents = $this->documentsTableExists()
            ? $organization->onboardingDocuments()->get()->keyBy('document_type')
            : collect();

        $signerComplete = $this->authorizedSignerIsComplete($organization);
        $boardMembersComplete = $this->boardMembersAreComplete($organization);
        $activeBoardMemberCount = $organization->boardMembers()->where('is_active', true)->count();

        return collect(OrganizationOnboardingRequirements::all())
            ->map(function (array $req) use ($documents, $signerComplete, $boardMembersComplete, $activeBoardMemberCount) {
                $connected = match ($req['type']) {
                    'upload' => $documents->has($req['id']),
                    'form' => $signerComplete,
                    'board_members' => $boardMembersComplete,
                    default => false,
                };

                $doc = $documents->get($req['id']);

                return [
                    'id' => $req['id'],
                    'label' => $req['label'],
                    'description' => $req['description'],
                    'benefit' => 'Required onboarding',
                    'type' => $req['type'],
                    'storage_path' => $req['storage_path'],
                    'route' => $req['route'],
                    'connected' => $connected,
                    'submitted_at' => $doc?->submitted_at?->toIso8601String(),
                    'file_name' => $doc?->metadata['original_name'] ?? null,
                    'board_member_count' => $req['type'] === 'board_members' ? $activeBoardMemberCount : null,
                    'board_member_minimum' => $req['type'] === 'board_members'
                        ? OrganizationOnboardingRequirements::MINIMUM_ACTIVE_BOARD_MEMBERS
                        : null,
                ];
            })
            ->values()
            ->all();
    }

    public function isComplete(Organization $organization): bool
    {
        $completion = $this->profileCompletionForOrganization($organization);

        return $completion !== null && $completion['percent'] >= 100;
    }

    public function boardMembersAreComplete(Organization $organization): bool
    {
        return $organization->boardMembers()
            ->where('is_active', true)
            ->count() >= OrganizationOnboardingRequirements::MINIMUM_ACTIVE_BOARD_MEMBERS;
    }

    public function authorizedSignerIsComplete(Organization $organization): bool
    {
        if (! $this->authorizedSignerColumnExists()) {
            return false;
        }

        $info = $organization->authorized_signer_info;
        if (! is_array($info)) {
            return false;
        }

        foreach (['full_name', 'title', 'email', 'phone'] as $field) {
            if (trim((string) ($info[$field] ?? '')) === '') {
                return false;
            }
        }

        return true;
    }

    /**
     * @return array{success: bool, message: string, document?: OrganizationOnboardingDocument}
     */
    public function storeUpload(Organization $organization, string $documentType, UploadedFile $file): array
    {
        $requirement = OrganizationOnboardingRequirements::find($documentType);
        if ($requirement === null || $requirement['type'] !== 'upload') {
            return ['success' => false, 'message' => 'Invalid document type.'];
        }

        $storagePath = $requirement['storage_path'];
        if ($storagePath === null) {
            return ['success' => false, 'message' => 'No storage path configured.'];
        }

        $safeName = $this->safeFileName($file->getClientOriginalName());
        $storedPath = null;
        $storageDisk = 'local';

        if ($this->governanceService->isDropboxConnected($organization)) {
            $api = $this->governanceService->getApiForOrganization($organization);

            if ($api && ! $this->governanceService->resolveProvisioned($organization, $api)) {
                $this->governanceService->provisionFolders($organization);
                $organization->refresh();
                $api = $this->governanceService->getApiForOrganization($organization);
            }

            if ($api && $this->governanceService->resolveProvisioned($organization, $api)) {
                $folderPath = $this->governanceService->validateGovernancePath($storagePath);
                if ($folderPath !== null) {
                    $localPath = $file->getRealPath();
                    if ($localPath !== false && is_readable($localPath)) {
                        $dropboxPath = $folderPath.'/'.$safeName;
                        $result = $api->uploadFromLocalPath($dropboxPath, $localPath);
                        if ($result !== null) {
                            $storedPath = $result['path_display'] ?? $dropboxPath;
                            $storageDisk = 'dropbox';
                        } else {
                            Log::warning('Onboarding Dropbox upload failed, falling back to local', [
                                'organization_id' => $organization->id,
                                'document_type' => $documentType,
                            ]);
                        }
                    }
                }
            }
        }

        if ($storedPath === null) {
            $relativePath = sprintf(
                'org-onboarding/%d/%s/%s',
                $organization->id,
                $documentType,
                $safeName
            );
            Storage::disk('local')->putFileAs(
                dirname($relativePath),
                $file,
                basename($relativePath)
            );
            $storedPath = $relativePath;
            $storageDisk = 'local';
        }

        if (! $this->documentsTableExists()) {
            return ['success' => false, 'message' => 'Onboarding tables are not migrated yet.'];
        }

        $document = OrganizationOnboardingDocument::query()->updateOrCreate(
            [
                'organization_id' => $organization->id,
                'document_type' => $documentType,
            ],
            [
                'file_path' => $storedPath,
                'metadata' => [
                    'original_name' => $file->getClientOriginalName(),
                    'storage_disk' => $storageDisk,
                    'governance_folder' => $storagePath,
                    'mime_type' => $file->getMimeType(),
                    'size' => $file->getSize(),
                ],
                'submitted_at' => now(),
            ]
        );

        $this->syncCompletionTimestamp($organization);

        return [
            'success' => true,
            'message' => $storageDisk === 'dropbox'
                ? 'Document uploaded to Governance Storage.'
                : 'Document saved. It will sync to Governance Storage when Dropbox is connected.',
            'document' => $document,
        ];
    }

    /**
     * When a governance storage file is removed, clear the matching onboarding record
     * so /governance/onboarding shows that step as incomplete again.
     *
     * @return array{revoked: bool, document_type: string|null, label: string|null}
     */
    public function revokeDocumentByStoragePath(Organization $organization, string $storagePath): array
    {
        if (! $this->documentsTableExists()) {
            return ['revoked' => false, 'document_type' => null, 'label' => null];
        }

        $normalizedPath = $this->normalizeComparableStoragePath($storagePath);

        $document = $organization->onboardingDocuments()
            ->get()
            ->first(function (OrganizationOnboardingDocument $doc) use ($normalizedPath) {
                $storedPath = (string) ($doc->file_path ?? '');

                return $storedPath !== ''
                    && $this->normalizeComparableStoragePath($storedPath) === $normalizedPath;
            });

        if ($document === null) {
            return ['revoked' => false, 'document_type' => null, 'label' => null];
        }

        $documentType = $document->document_type;
        $requirement = OrganizationOnboardingRequirements::find($documentType);
        $label = $requirement['label'] ?? null;

        $document->delete();
        $this->syncCompletionTimestamp($organization);

        return [
            'revoked' => true,
            'document_type' => $documentType,
            'label' => $label,
        ];
    }

    /**
     * @return array{success: bool, message: string}
     */
    public function deleteDocument(Organization $organization, string $documentType): array
    {
        $requirement = OrganizationOnboardingRequirements::find($documentType);
        if ($requirement === null || $requirement['type'] !== 'upload') {
            return ['success' => false, 'message' => 'Invalid document type.'];
        }

        if (! $this->documentsTableExists()) {
            return ['success' => false, 'message' => 'Onboarding tables are not migrated yet.'];
        }

        $document = $organization->onboardingDocuments()
            ->where('document_type', $documentType)
            ->first();

        if ($document === null) {
            return ['success' => false, 'message' => 'No document on file for this step.'];
        }

        $this->tryDeleteStoredFile($organization, $document);

        $document->delete();
        $this->syncCompletionTimestamp($organization);

        return [
            'success' => true,
            'message' => ($requirement['label'] ?? 'Document').' removed. Upload a new file to complete this step.',
        ];
    }

    /**
     * Remove the physical file from storage when it still exists there.
     * Onboarding record removal proceeds even when the file is already gone.
     */
    private function tryDeleteStoredFile(Organization $organization, OrganizationOnboardingDocument $document): void
    {
        $filePath = trim((string) ($document->file_path ?? ''));
        if ($filePath === '') {
            return;
        }

        $metadata = is_array($document->metadata) ? $document->metadata : [];
        $storageDisk = (string) ($metadata['storage_disk'] ?? 'local');

        if ($storageDisk === 'dropbox') {
            if (! $this->governanceService->isDropboxConnected($organization)) {
                return;
            }

            $api = $this->governanceService->getApiForOrganization($organization);
            if (! $api) {
                Log::warning('Onboarding document delete skipped Dropbox (no API)', [
                    'organization_id' => $organization->id,
                    'document_type' => $document->document_type,
                    'file_path' => $filePath,
                ]);

                return;
            }

            if (! $api->fileExists($filePath)) {
                return;
            }

            if (! $api->deleteFile($filePath)) {
                Log::warning('Onboarding document delete failed in Dropbox; clearing onboarding record anyway', [
                    'organization_id' => $organization->id,
                    'document_type' => $document->document_type,
                    'file_path' => $filePath,
                ]);
            }

            return;
        }

        if (Storage::disk('local')->exists($filePath)) {
            Storage::disk('local')->delete($filePath);
        }
    }

    private function normalizeComparableStoragePath(string $path): string
    {
        $path = trim(str_replace('\\', '/', $path));
        if ($path === '') {
            return '';
        }

        if (! str_starts_with($path, '/')) {
            $path = '/'.$path;
        }

        if (str_starts_with($path, '/Governance')) {
            return GovernanceFolderStructure::normalizePath($path);
        }

        return preg_replace('#/+#', '/', $path) ?: $path;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array{success: bool, message: string}
     */
    public function storeAuthorizedSigner(Organization $organization, array $data): array
    {
        if (! $this->authorizedSignerColumnExists()) {
            return ['success' => false, 'message' => 'Onboarding tables are not migrated yet.'];
        }

        $organization->forceFill([
            'authorized_signer_info' => [
                'full_name' => trim((string) ($data['full_name'] ?? '')),
                'title' => trim((string) ($data['title'] ?? '')),
                'email' => trim((string) ($data['email'] ?? '')),
                'phone' => trim((string) ($data['phone'] ?? '')),
                'address' => trim((string) ($data['address'] ?? '')),
            ],
        ])->save();

        $this->syncCompletionTimestamp($organization);

        return ['success' => true, 'message' => 'Authorized signer information saved.'];
    }

    public function syncCompletionTimestamp(Organization $organization): void
    {
        if (! $this->onboardingCompletedColumnExists()) {
            return;
        }

        $complete = $this->isComplete($organization);
        $organization->forceFill([
            'onboarding_completed_at' => $complete ? ($organization->onboarding_completed_at ?? now()) : null,
        ])->save();
    }

    private function safeFileName(string $originalName): string
    {
        $base = pathinfo($originalName, PATHINFO_FILENAME);
        $ext = pathinfo($originalName, PATHINFO_EXTENSION);
        $slug = Str::slug($base);
        if ($slug === '') {
            $slug = 'document';
        }

        return $ext !== '' ? "{$slug}.{$ext}" : $slug;
    }

    private function documentsTableExists(): bool
    {
        return Schema::hasTable('organization_onboarding_documents');
    }

    private function authorizedSignerColumnExists(): bool
    {
        return Schema::hasColumn('organizations', 'authorized_signer_info');
    }

    private function onboardingCompletedColumnExists(): bool
    {
        return Schema::hasColumn('organizations', 'onboarding_completed_at');
    }
}
