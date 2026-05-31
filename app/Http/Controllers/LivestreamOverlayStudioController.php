<?php

namespace App\Http\Controllers;

use App\Models\Organization;
use App\Models\User;
use App\Services\LivestreamVideoOverlayService;
use App\Support\LivestreamOverlayConfig;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class LivestreamOverlayStudioController extends Controller
{
    public function supporterIndex(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user();
        $user->loadMissing('organization');

        $org = Organization::forAuthUser($user);
        if ($org !== null) {
            return $this->renderStudio(LivestreamOverlayConfig::forOrganization($org), [
                'scope' => 'organization',
                'ownerLabel' => $org->name,
                'updateUrl' => route('organization.livestreams.overlay-studio.update'),
                'uploadLogoUrl' => route('organization.livestreams.overlay-studio.upload-logo'),
                'uploadSponsorUrl' => route('organization.livestreams.overlay-studio.upload-sponsor'),
                'uploadQrUrl' => route('organization.livestreams.overlay-studio.upload-qr'),
                'removeAssetUrl' => route('organization.livestreams.overlay-studio.remove-asset'),
            ]);
        }

        return $this->renderStudio(LivestreamOverlayConfig::forUser($user), [
            'scope' => 'user',
            'ownerLabel' => $user->name ?? 'Your stream',
            'updateUrl' => route('livestreams.supporter.overlay-studio.update'),
            'uploadLogoUrl' => route('livestreams.supporter.overlay-studio.upload-logo'),
            'uploadSponsorUrl' => route('livestreams.supporter.overlay-studio.upload-sponsor'),
            'uploadQrUrl' => route('livestreams.supporter.overlay-studio.upload-qr'),
            'removeAssetUrl' => route('livestreams.supporter.overlay-studio.remove-asset'),
        ]);
    }

    public function organizationIndex(): Response
    {
        $user = Auth::user();
        $organization = Organization::forAuthUser($user);

        if ($organization === null) {
            abort(404, 'Organization not found.');
        }

        return $this->renderStudio(LivestreamOverlayConfig::forOrganization($organization), [
            'scope' => 'organization',
            'ownerLabel' => $organization->name,
            'updateUrl' => route('organization.livestreams.overlay-studio.update'),
            'uploadLogoUrl' => route('organization.livestreams.overlay-studio.upload-logo'),
            'uploadSponsorUrl' => route('organization.livestreams.overlay-studio.upload-sponsor'),
            'uploadQrUrl' => route('organization.livestreams.overlay-studio.upload-qr'),
            'removeAssetUrl' => route('organization.livestreams.overlay-studio.remove-asset'),
        ]);
    }

    /**
     * @param  array<string, mixed>  $meta
     */
    protected function renderStudio(array $config, array $meta): Response
    {
        return Inertia::render('frontend/livestreams/OverlayStudio', [
            'overlay' => LivestreamOverlayConfig::toStudioPayload($config),
            'meta' => $meta,
            'ffmpegAvailable' => app(LivestreamVideoOverlayService::class)->canApply(),
        ]);
    }

    public function supporterUpdate(Request $request): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();
        $org = Organization::forAuthUser($user);
        if ($org !== null) {
            return $this->persistSettings($request, $org);
        }

        return $this->persistSettings($request, $user);
    }

    public function organizationUpdate(Request $request): RedirectResponse
    {
        $organization = Organization::forAuthUser(Auth::user());
        if ($organization === null) {
            abort(404);
        }

        return $this->persistSettings($request, $organization);
    }

    protected function persistSettings(Request $request, Organization|User $owner): RedirectResponse
    {
        $validated = $request->validate([
            'enabled' => 'nullable|boolean',
            'accent_color' => 'nullable|string|max:7',
            'banner_message' => 'nullable|string|max:120',
            'banner_cta' => 'nullable|string|max:60',
            'donation_message' => 'nullable|string|max:120',
            'donation_cta' => 'nullable|string|max:60',
            'sponsor_label' => 'nullable|string|max:80',
            'scrolling_message' => 'nullable|string|max:200',
            'qr_label' => 'nullable|string|max:60',
            'show_live_badge' => 'nullable|boolean',
        ]);

        $current = LivestreamOverlayConfig::merge(
            $owner instanceof Organization
                ? $owner->livestream_overlay_settings
                : $owner->livestream_overlay_settings,
        );

        $next = array_merge($current, [
            'enabled' => array_key_exists('enabled', $validated)
                ? filter_var($validated['enabled'], FILTER_VALIDATE_BOOLEAN)
                : $current['enabled'],
            'accent_color' => LivestreamOverlayConfig::normalizeHex(
                (string) ($validated['accent_color'] ?? $current['accent_color']),
            ),
            'banner_message' => (string) ($validated['banner_message'] ?? $current['banner_message']),
            'banner_cta' => (string) ($validated['banner_cta'] ?? $current['banner_cta']),
            'donation_message' => (string) ($validated['donation_message'] ?? $current['donation_message']),
            'donation_cta' => (string) ($validated['donation_cta'] ?? $current['donation_cta']),
            'sponsor_label' => (string) ($validated['sponsor_label'] ?? $current['sponsor_label']),
            'scrolling_message' => (string) ($validated['scrolling_message'] ?? $current['scrolling_message']),
            'qr_label' => (string) ($validated['qr_label'] ?? $current['qr_label']),
            'show_live_badge' => array_key_exists('show_live_badge', $validated)
                ? filter_var($validated['show_live_badge'], FILTER_VALIDATE_BOOLEAN)
                : $current['show_live_badge'],
        ]);

        unset($next['logo_from_profile']);

        $owner->livestream_overlay_settings = $next;
        $owner->save();

        return back()->with('success', 'Overlay settings saved.');
    }

    public function supporterUploadLogo(Request $request): RedirectResponse
    {
        return $this->uploadAsset($request, 'logo', 'logo_path', 'logo');
    }

    public function supporterUploadSponsor(Request $request): RedirectResponse
    {
        return $this->uploadAsset($request, 'sponsor', 'sponsor_image_path', 'sponsor');
    }

    public function supporterUploadQr(Request $request): RedirectResponse
    {
        return $this->uploadAsset($request, 'qr', 'qr_code_path', 'qr');
    }

    public function organizationUploadLogo(Request $request): RedirectResponse
    {
        return $this->uploadAsset($request, 'logo', 'logo_path', 'logo');
    }

    public function organizationUploadSponsor(Request $request): RedirectResponse
    {
        return $this->uploadAsset($request, 'sponsor', 'sponsor_image_path', 'sponsor');
    }

    public function organizationUploadQr(Request $request): RedirectResponse
    {
        return $this->uploadAsset($request, 'qr', 'qr_code_path', 'qr');
    }

    protected function uploadAsset(
        Request $request,
        string $field,
        string $settingsKey,
        string $filenamePrefix,
    ): RedirectResponse {
        $request->validate([
            $field => 'required|image|max:4096',
        ]);

        $owner = $this->resolveOwner($request);
        $file = $request->file($field);
        if ($file === null) {
            return back()->with('error', 'No file uploaded.');
        }

        $dir = LivestreamOverlayConfig::storageDirectory($owner);
        Storage::disk('public')->makeDirectory($dir);

        $current = LivestreamOverlayConfig::merge($owner->livestream_overlay_settings);
        $oldPath = $current[$settingsKey] ?? null;
        if (is_string($oldPath) && str_starts_with($oldPath, $dir.'/')) {
            Storage::disk('public')->delete($oldPath);
        }

        $ext = $file->getClientOriginalExtension() ?: 'png';
        $path = $file->storeAs($dir, $filenamePrefix.'-'.time().'.'.$ext, 'public');

        $current[$settingsKey] = $path;
        unset($current['logo_from_profile']);
        $owner->livestream_overlay_settings = $current;
        $owner->save();

        return back()->with('success', 'Image uploaded.');
    }

    public function supporterRemoveAsset(Request $request): RedirectResponse
    {
        return $this->removeAsset($request);
    }

    public function organizationRemoveAsset(Request $request): RedirectResponse
    {
        return $this->removeAsset($request);
    }

    protected function removeAsset(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'asset' => 'required|in:logo,sponsor,qr',
        ]);

        $map = [
            'logo' => 'logo_path',
            'sponsor' => 'sponsor_image_path',
            'qr' => 'qr_code_path',
        ];

        $owner = $this->resolveOwner($request);
        $current = LivestreamOverlayConfig::merge($owner->livestream_overlay_settings);
        $key = $map[$validated['asset']];
        $path = $current[$key] ?? null;

        if (is_string($path) && Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }

        $current[$key] = null;
        unset($current['logo_from_profile']);
        $owner->livestream_overlay_settings = $current;
        $owner->save();

        return back()->with('success', 'Image removed.');
    }

    protected function resolveOwner(Request $request): Organization|User
    {
        /** @var User $user */
        $user = $request->user();
        $org = Organization::forAuthUser($user);

        if ($request->routeIs('organization.livestreams.overlay-studio.*')) {
            if ($org === null) {
                abort(404, 'Organization not found.');
            }

            return $org;
        }

        if ($org !== null) {
            return $org;
        }

        return $user;
    }
}
