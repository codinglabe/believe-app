<?php

namespace App\Support;

use App\Models\Organization;
use App\Models\OrganizationLivestream;
use App\Models\User;
use App\Models\UserLivestream;
use Illuminate\Support\Facades\Storage;

/**
 * Unity Live Overlay Studio — org/supporter branding for live + recorded streams.
 */
class LivestreamOverlayConfig
{
    public const DEFAULT_ACCENT = '#7C3AED';

    /**
     * @return array<string, mixed>
     */
    public static function defaults(): array
    {
        return [
            'enabled' => true,
            'accent_color' => self::DEFAULT_ACCENT,
            'logo_path' => null,
            'speaker_name' => '',
            'banner_message' => '',
            'banner_cta' => '',
            'donation_message' => '',
            'donation_cta' => '',
            'sponsor_image_path' => null,
            'sponsor_label' => "Today's Major Sponsor",
            'scrolling_message' => '',
            'qr_code_path' => null,
            'qr_label' => 'Scan to Donate',
            'show_live_badge' => true,
        ];
    }

    /**
     * @param  array<string, mixed>|null  $raw
     * @return array<string, mixed>
     */
    public static function merge(?array $raw): array
    {
        $merged = array_merge(self::defaults(), is_array($raw) ? $raw : []);
        $merged['enabled'] = filter_var($merged['enabled'] ?? true, FILTER_VALIDATE_BOOLEAN);
        $merged['show_live_badge'] = filter_var($merged['show_live_badge'] ?? true, FILTER_VALIDATE_BOOLEAN);
        $merged['accent_color'] = self::normalizeHex((string) ($merged['accent_color'] ?? self::DEFAULT_ACCENT));

        return $merged;
    }

    public static function forOrganization(?Organization $organization): array
    {
        if ($organization === null) {
            return self::defaults();
        }

        $config = self::merge($organization->livestream_overlay_settings);

        if (empty($config['logo_path']) && ! empty($organization->registered_user_image)) {
            $config['logo_path'] = (string) $organization->registered_user_image;
            $config['logo_from_profile'] = true;
        }

        return $config;
    }

    public static function forUser(?User $user): array
    {
        if ($user === null) {
            return self::defaults();
        }

        // Org accounts configure overlay on the organization (see Overlay Studio); supporter
        // UserLivestreams must use the same settings, not empty user-level JSON.
        $org = Organization::forAuthUser($user);
        if ($org !== null) {
            return self::forOrganization($org);
        }

        $config = self::merge($user->livestream_overlay_settings);

        if (empty($config['logo_path'])) {
            if (! empty($user->registered_user_image)) {
                $config['logo_path'] = (string) $user->registered_user_image;
                $config['logo_from_profile'] = true;
            } elseif (! empty($user->image)) {
                $config['logo_path'] = (string) $user->image;
                $config['logo_from_profile'] = true;
            }
        }

        return $config;
    }

    public static function forLivestream(OrganizationLivestream|UserLivestream $livestream): array
    {
        if ($livestream instanceof OrganizationLivestream) {
            $livestream->loadMissing('organization');

            return self::forOrganization($livestream->organization);
        }

        $livestream->loadMissing('user');

        return self::forUser($livestream->user);
    }

    /**
     * Public-safe payload for Unity Live viewer overlays.
     *
     * @param  array<string, mixed>  $config
     * @return array<string, mixed>|null
     */
    public static function toPublicPayload(array $config): ?array
    {
        if (! ($config['enabled'] ?? true)) {
            return null;
        }

        $hasContent = self::hasLogo($config)
            || trim((string) ($config['speaker_name'] ?? '')) !== ''
            || trim((string) ($config['banner_message'] ?? '')) !== ''
            || trim((string) ($config['banner_cta'] ?? '')) !== ''
            || trim((string) ($config['donation_message'] ?? '')) !== ''
            || trim((string) ($config['donation_cta'] ?? '')) !== ''
            || self::hasSponsor($config)
            || trim((string) ($config['scrolling_message'] ?? '')) !== ''
            || ! empty($config['qr_code_path']);

        if (! $hasContent) {
            return null;
        }

        return [
            'accentColor' => (string) ($config['accent_color'] ?? self::DEFAULT_ACCENT),
            'logoUrl' => self::publicUrl($config['logo_path'] ?? null),
            'speakerName' => trim((string) ($config['speaker_name'] ?? '')),
            'bannerMessage' => trim((string) ($config['banner_message'] ?? '')),
            'bannerCta' => trim((string) ($config['banner_cta'] ?? '')),
            'donationMessage' => trim((string) ($config['donation_message'] ?? '')),
            'donationCta' => trim((string) ($config['donation_cta'] ?? '')),
            'sponsorImageUrl' => self::publicUrl($config['sponsor_image_path'] ?? null),
            'sponsorLabel' => trim((string) ($config['sponsor_label'] ?? '')),
            'scrollingMessage' => trim((string) ($config['scrolling_message'] ?? '')),
            'qrCodeUrl' => self::publicUrl($config['qr_code_path'] ?? null),
            'qrLabel' => trim((string) ($config['qr_label'] ?? '')),
            'showLiveBadge' => (bool) ($config['show_live_badge'] ?? true),
        ];
    }

    /**
     * Payload for recorded video branding (logo, speaker, sponsor, bottom CTA banner).
     *
     * @param  array<string, mixed>  $config
     * @return array<string, mixed>|null
     */
    public static function toVideoPayload(array $config): ?array
    {
        if (! ($config['enabled'] ?? true)) {
            return null;
        }

        $hasBanner = trim((string) ($config['banner_message'] ?? '')) !== ''
            || trim((string) ($config['banner_cta'] ?? '')) !== '';

        if (
            ! self::hasLogo($config)
            && ! $hasBanner
            && ! self::hasSponsor($config)
            && trim((string) ($config['speaker_name'] ?? '')) === ''
        ) {
            return null;
        }

        return [
            'accentColor' => (string) ($config['accent_color'] ?? self::DEFAULT_ACCENT),
            'logoUrl' => self::publicUrl($config['logo_path'] ?? null),
            'speakerName' => trim((string) ($config['speaker_name'] ?? '')),
            'bannerMessage' => trim((string) ($config['banner_message'] ?? '')),
            'bannerCta' => trim((string) ($config['banner_cta'] ?? '')),
            'sponsorImageUrl' => self::publicUrl($config['sponsor_image_path'] ?? null),
            'sponsorLabel' => trim((string) ($config['sponsor_label'] ?? '')),
        ];
    }

    /**
     * @param  array<string, mixed>  $config
     */
    public static function hasLogo(array $config): bool
    {
        $path = $config['logo_path'] ?? null;

        return is_string($path) && $path !== '' && Storage::disk('public')->exists($path);
    }

    /**
     * @param  array<string, mixed>  $config
     */
    public static function hasSponsor(array $config): bool
    {
        $path = $config['sponsor_image_path'] ?? null;

        return is_string($path) && $path !== '' && Storage::disk('public')->exists($path);
    }

    public static function publicUrl(?string $path): ?string
    {
        if (! is_string($path) || $path === '') {
            return null;
        }

        if (! Storage::disk('public')->exists($path)) {
            return null;
        }

        return Storage::disk('public')->url($path);
    }

    public static function storageDirectory(Organization|User $owner): string
    {
        $prefix = $owner instanceof Organization ? 'org' : 'user';

        return 'livestream-overlays/'.$prefix.'-'.$owner->id;
    }

    public static function normalizeHex(string $value): string
    {
        $value = trim($value);
        if ($value === '') {
            return self::DEFAULT_ACCENT;
        }
        if ($value[0] !== '#') {
            $value = '#'.$value;
        }

        return preg_match('/^#[0-9A-Fa-f]{6}$/', $value) === 1 ? strtoupper($value) : self::DEFAULT_ACCENT;
    }

    /**
     * @param  array<string, mixed>  $config
     * @return array<string, mixed>
     */
    public static function toStudioPayload(array $config): array
    {
        return [
            'enabled' => (bool) ($config['enabled'] ?? true),
            'accentColor' => (string) ($config['accent_color'] ?? self::DEFAULT_ACCENT),
            'logoUrl' => self::publicUrl($config['logo_path'] ?? null),
            'logoFromProfile' => (bool) ($config['logo_from_profile'] ?? false),
            'speakerName' => (string) ($config['speaker_name'] ?? ''),
            'bannerMessage' => (string) ($config['banner_message'] ?? ''),
            'bannerCta' => (string) ($config['banner_cta'] ?? ''),
            'donationMessage' => (string) ($config['donation_message'] ?? ''),
            'donationCta' => (string) ($config['donation_cta'] ?? ''),
            'sponsorImageUrl' => self::publicUrl($config['sponsor_image_path'] ?? null),
            'sponsorLabel' => (string) ($config['sponsor_label'] ?? ''),
            'scrollingMessage' => (string) ($config['scrolling_message'] ?? ''),
            'qrCodeUrl' => self::publicUrl($config['qr_code_path'] ?? null),
            'qrLabel' => (string) ($config['qr_label'] ?? ''),
            'showLiveBadge' => (bool) ($config['show_live_badge'] ?? true),
        ];
    }
}
