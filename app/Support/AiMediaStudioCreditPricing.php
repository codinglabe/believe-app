<?php

namespace App\Support;

/**
 * Retail AI Media Studio credit cost (1 credit = US$1.00) by resolution tier and duration.
 */
class AiMediaStudioCreditPricing
{
    /**
     * Default suggested retail (USD = credits) per fal billing table.
     *
     * @var array<string, array<int, float>>
     */
    private const DEFAULT_USD_BY_TIER_AND_SECONDS = [
        '480p' => [5 => 0.99, 10 => 1.49],
        '720p' => [5 => 1.49, 10 => 2.49],
        '1080p' => [5 => 1.99, 10 => 3.99],
    ];

    /**
     * Matrix for Inertia / JSON: duration keys as strings.
     *
     * @return array<string, array<string, float>>
     */
    public static function retailMatrixForFrontend(): array
    {
        $out = [];
        foreach (self::resolvedMatrix() as $tier => $byDur) {
            $out[$tier] = [];
            foreach ($byDur as $sec => $usd) {
                $out[$tier][(string) (int) $sec] = round((float) $usd, 2);
            }
        }

        return $out;
    }

    /**
     * Credits (USD) to charge for one queued generation.
     */
    public static function retailCredits(string $resolutionTier, int $durationSeconds): float
    {
        $tier = strtolower(trim($resolutionTier));
        if (! in_array($tier, AiMediaStudioResolution::allowedTiers(), true)) {
            $tier = AiMediaStudioResolution::defaultTier();
        }

        $matrix = self::resolvedMatrix();
        $byTier = $matrix[$tier] ?? $matrix[AiMediaStudioResolution::defaultTier()] ?? self::DEFAULT_USD_BY_TIER_AND_SECONDS['1080p'];

        $d = in_array($durationSeconds, [5, 10], true) ? $durationSeconds : ($durationSeconds <= 5 ? 5 : 10);

        $price = $byTier[$d] ?? $byTier[10] ?? $byTier[5] ?? 3.99;

        return round((float) $price, 2);
    }

    /**
     * @return array<string, array<int, float>>
     */
    private static function resolvedMatrix(): array
    {
        $out = self::DEFAULT_USD_BY_TIER_AND_SECONDS;
        $configured = config('services.ai_media_studio.retail_credit_prices_usd');
        if (! is_array($configured)) {
            return $out;
        }

        foreach (['480p', '720p', '1080p'] as $validTier) {
            if (! isset($configured[$validTier]) || ! is_array($configured[$validTier])) {
                continue;
            }
            foreach ([5, 10] as $sec) {
                if (! array_key_exists($sec, $configured[$validTier])) {
                    continue;
                }
                $v = $configured[$validTier][$sec];
                if (is_numeric($v)) {
                    $out[$validTier][$sec] = round((float) $v, 2);
                }
            }
        }

        return $out;
    }
}
