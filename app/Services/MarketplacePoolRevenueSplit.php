<?php

namespace App\Services;

/**
 * Splits pool / org-catalog line revenue between merchant and nonprofit only.
 * Stored percentages must total 100% on save. Legacy products may have had a third
 * "BIU" share on the product row; we scale merchant + nonprofit to 100% so their
 * ratio is preserved and the line fully allocates with no separate BIU bucket.
 */
final class MarketplacePoolRevenueSplit
{
    /**
     * Scale merchant + nonprofit to 100% (for display). Rounded to two decimals; nonprofit is remainder.
     *
     * @return array{pct_merchant: float, pct_nonprofit: float}
     */
    public static function effectivePercentages(float $pctMerchant, float $pctNonprofit): array
    {
        $pctM = max(0.0, $pctMerchant);
        $pctN = max(0.0, $pctNonprofit);
        $denom = $pctM + $pctN;
        if ($denom <= 0.00001) {
            return ['pct_merchant' => 100.0, 'pct_nonprofit' => 0.0];
        }
        $effM = round($pctM / $denom * 100, 2);
        $effN = round(100 - $effM, 2);

        return ['pct_merchant' => $effM, 'pct_nonprofit' => $effN];
    }

    /**
     * @return array{merchant_cents: int, nonprofit_cents: int}
     */
    public static function allocateLineCents(int $lineCents, float $pctMerchant, float $pctNonprofit): array
    {
        if ($lineCents <= 0) {
            return ['merchant_cents' => 0, 'nonprofit_cents' => 0];
        }

        $pctM = max(0.0, $pctMerchant);
        $pctN = max(0.0, $pctNonprofit);
        $denom = $pctM + $pctN;

        if ($denom <= 0.00001) {
            return ['merchant_cents' => $lineCents, 'nonprofit_cents' => 0];
        }

        $pctM = ($pctM / $denom) * 100.0;
        $mCents = (int) round($lineCents * $pctM / 100.0);
        $nCents = $lineCents - $mCents;

        return ['merchant_cents' => $mCents, 'nonprofit_cents' => $nCents];
    }
}
