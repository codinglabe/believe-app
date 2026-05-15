<?php

namespace App\Support;

/**
 * Maps AI Media Studio resolution tiers to pixel sizes and optional fal.ai input values.
 */
class AiMediaStudioResolution
{
    /** @var array<string, string> */
    private const TIER_PIXELS_9_16 = [
        '480p' => '480x854',
        '720p' => '720x1280',
        '1080p' => '1080x1920',
    ];

    /** @var array<string, string> */
    private const TIER_PIXELS_16_9 = [
        '480p' => '854x480',
        '720p' => '1280x720',
        '1080p' => '1920x1080',
    ];

    private const VALID_TIERS = ['480p', '720p', '1080p'];

    /**
     * Infer tier from stored WxH string (e.g. 854x480) for older rows missing resolution_tier.
     */
    public static function inferTierFromResolutionString(?string $resolution, ?string $orientation): string
    {
        if (! is_string($resolution) || trim($resolution) === '') {
            return '';
        }
        $resolution = strtolower(trim($resolution));
        $o = ($orientation === '16:9') ? '16:9' : '9:16';
        foreach (self::VALID_TIERS as $t) {
            if (self::pixels($o, $t) === $resolution) {
                return $t;
            }
        }

        return '';
    }

    /**
     * @return array{width: int, height: int}
     */
    public static function dimensions(string $orientation, string $tier): array
    {
        $p = self::pixels($orientation, $tier);
        $parts = explode('x', strtolower($p));
        if (count($parts) !== 2) {
            return ['width' => 1280, 'height' => 720];
        }

        return ['width' => (int) $parts[0], 'height' => (int) $parts[1]];
    }

    /**
     * Extra fal queue keys for resolution / size (merged after env extras, before caller overrides).
     *
     * @return array<string, int|string>
     */
    public static function falQueueSizePayload(?string $orientation, ?string $resolutionTier): array
    {
        if (! is_string($resolutionTier) || trim($resolutionTier) === '') {
            return [];
        }
        $orientation = ($orientation === '16:9') ? '16:9' : '9:16';
        $tier = strtolower(trim($resolutionTier));
        if (! in_array($tier, self::VALID_TIERS, true)) {
            return [];
        }

        $out = [];

        if (filter_var(config('services.ai_media_studio.fal_send_aspect_ratio', true), FILTER_VALIDATE_BOOLEAN)) {
            $k = trim((string) config('services.ai_media_studio.fal_aspect_ratio_param', 'aspect_ratio'));
            if ($k !== '') {
                $out[$k] = $orientation;
            }
        }

        if (filter_var(config('services.ai_media_studio.fal_send_resolution_tier', true), FILTER_VALIDATE_BOOLEAN)) {
            $k = trim((string) config('services.ai_media_studio.fal_resolution_param', 'resolution'));
            if ($k !== '') {
                $out[$k] = self::falApiValue($orientation, $tier);
            }
        }

        if (filter_var(config('services.ai_media_studio.fal_send_dimensions', true), FILTER_VALIDATE_BOOLEAN)) {
            $d = self::dimensions($orientation, $tier);
            $out['width'] = $d['width'];
            $out['height'] = $d['height'];
        }

        return $out;
    }

    /**
     * @return list<string>
     */
    public static function allowedTiers(): array
    {
        $configured = config('services.ai_media_studio.video_resolution_tiers', self::VALID_TIERS);
        if (! is_array($configured)) {
            return ['1080p'];
        }

        $normalized = [];
        foreach ($configured as $t) {
            if (! is_string($t)) {
                continue;
            }
            $t = strtolower(trim($t));
            if (in_array($t, self::VALID_TIERS, true)) {
                $normalized[] = $t;
            }
        }

        $normalized = array_values(array_unique($normalized));

        return $normalized !== [] ? $normalized : ['1080p'];
    }

    public static function defaultTier(): string
    {
        $allowed = self::allowedTiers();
        foreach (['1080p', '720p', '480p'] as $candidate) {
            if (in_array($candidate, $allowed, true)) {
                return $candidate;
            }
        }

        return $allowed[0] ?? '1080p';
    }

    public static function pixels(string $orientation, string $tier): string
    {
        $tier = strtolower(trim($tier));
        $map = $orientation === '16:9' ? self::TIER_PIXELS_16_9 : self::TIER_PIXELS_9_16;

        return $map[$tier] ?? ($orientation === '16:9' ? '1920x1080' : '1080x1920');
    }

    /**
     * Value merged into fal queue input when {@see config('services.ai_media_studio.fal_resolution_param')} is set.
     */
    public static function falApiValue(string $orientation, string $tier): string
    {
        $format = strtolower(trim((string) config('services.ai_media_studio.fal_resolution_value_format', 'tier')));
        if ($format === 'pixels' || $format === 'dimensions') {
            return self::pixels($orientation, $tier);
        }

        $t = strtolower(trim($tier));
        $variant = strtolower(trim((string) config('services.ai_media_studio.fal_resolution_tier_output', 'lowercase')));
        if ($variant === 'suffix_upper' || $variant === 'minimax' || $variant === 'upper_p') {
            return preg_replace('/(\d+)p$/', '$1P', $t) ?? $t;
        }

        return $t;
    }

    /**
     * @return array<string, array<string, string>>
     */
    public static function pixelMatrixForTiers(array $tiers): array
    {
        $out = ['9:16' => [], '16:9' => []];
        foreach ($tiers as $t) {
            if (! is_string($t)) {
                continue;
            }
            $t = strtolower(trim($t));
            if (! in_array($t, self::VALID_TIERS, true)) {
                continue;
            }
            $out['9:16'][$t] = str_replace('x', '×', self::pixels('9:16', $t));
            $out['16:9'][$t] = str_replace('x', '×', self::pixels('16:9', $t));
        }

        return $out;
    }
}
