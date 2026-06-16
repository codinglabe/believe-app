<?php

namespace App\Http\Controllers\Organization;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Services\OrganizationOnboardingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class OrganizationOnboardingController extends Controller
{
    public function __construct(
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

    public function index(): Response
    {
        $org = $this->resolveOrg();
        $completion = $this->onboardingService->profileCompletionForOrganization($org);

        return Inertia::render('Organization/Onboarding/Index', [
            'items' => $completion['items'] ?? [],
            'percent' => $completion['percent'] ?? 0,
            'completed' => $completion['completed'] ?? 0,
            'total' => $completion['total'] ?? 0,
            'authorizedSigner' => is_array($org->authorized_signer_info) ? $org->authorized_signer_info : null,
            'storageHref' => route('governance.storage.index'),
            'filingPdfUrl' => route('board-members.filing-pdf'),
            'boardMembers' => $org->boardMembers()
                ->with('user')
                ->orderByDesc('is_active')
                ->orderBy('position')
                ->get()
                ->map(fn ($member) => [
                    'id' => $member->id,
                    'name' => $member->user?->name ?? '—',
                    'email' => $member->user?->email ?? '',
                    'position' => $member->position,
                    'is_active' => $member->is_active,
                    'appointed_on' => $member->appointed_on?->toIso8601String(),
                ])
                ->values()
                ->all(),
        ]);
    }

    public function upload(Request $request): RedirectResponse|JsonResponse
    {
        @ini_set('memory_limit', '512M');
        @ini_set('max_execution_time', '600');

        $org = $this->resolveOrg();

        $request->validate([
            'document_type' => ['required', 'string'],
            'file' => ['required', 'file', 'max:51200'],
        ]);

        $uploaded = $request->file('file');
        if (! $uploaded instanceof UploadedFile) {
            return $this->uploadResponse($request, false, 'No file received.');
        }

        $result = $this->onboardingService->storeUpload(
            $org,
            (string) $request->input('document_type'),
            $uploaded
        );

        return $this->uploadResponse($request, $result['success'], $result['message']);
    }

    public function destroyDocument(Request $request): RedirectResponse|JsonResponse
    {
        $org = $this->resolveOrg();

        $request->validate([
            'document_type' => ['required', 'string'],
        ]);

        $result = $this->onboardingService->deleteDocument(
            $org,
            (string) $request->input('document_type')
        );

        if ($this->wantsJsonResponse($request)) {
            return response()->json([
                'success' => $result['success'],
                'message' => $result['message'],
            ], $result['success'] ? 200 : 422);
        }

        return redirect()
            ->route('governance.onboarding.index')
            ->with($result['success'] ? 'success' : 'error', $result['message']);
    }

    public function storeAuthorizedSigner(Request $request): RedirectResponse
    {
        $org = $this->resolveOrg();

        $validated = $request->validate([
            'full_name' => ['required', 'string', 'max:255'],
            'title' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['required', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:500'],
        ]);

        $result = $this->onboardingService->storeAuthorizedSigner($org, $validated);

        if ($result['success']) {
            return redirect()->route('governance.onboarding.index')->with('success', $result['message']);
        }

        return redirect()->route('governance.onboarding.index')->with('error', $result['message']);
    }

    private function uploadResponse(Request $request, bool $success, string $message): RedirectResponse|JsonResponse
    {
        if ($this->wantsJsonResponse($request)) {
            return response()->json([
                'success' => $success,
                'message' => $message,
            ], $success ? 200 : 422);
        }

        return redirect()
            ->route('governance.onboarding.index')
            ->with($success ? 'success' : 'error', $message);
    }

    private function wantsJsonResponse(Request $request): bool
    {
        return ($request->expectsJson() || $request->ajax()) && ! $request->header('X-Inertia');
    }
}
