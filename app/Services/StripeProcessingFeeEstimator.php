<?php

namespace App\Services;

use App\Models\AdminSetting;

/**
 * Estimates Stripe card/ACH processing fees for UI copy and checkout gross-up across the app
 * (donations, raffles, node sales, etc.). Rates are configurable by admins via
 * {@see AdminSetting} key `stripe_processing_fee_estimates` (legacy: `donation_fee_estimates`).
 */
class StripeProcessingFeeEstimator
{
    public const DEFAULT_CARD_PERCENT = 0.029;

    public const DEFAULT_CARD_FIXED_USD = 0.30;

    public const DEFAULT_ACH_PERCENT = 0.008;

    public const DEFAULT_ACH_FEE_CAP_USD = 5.0;

    private static ?array $ratesCache = null;

    public static function forgetRatesCache(): void
    {
        self::$ratesCache = null;
    }

    /**
     * @return array{card_percent: float, card_fixed_usd: float, ach_percent: float, ach_fee_cap_usd: float}
     */
    public static function rates(): array
    {
        if (self::$ratesCache !== null) {
            return self::$ratesCache;
        }

        $defaults = [
            'card_percent' => self::DEFAULT_CARD_PERCENT,
            'card_fixed_usd' => self::DEFAULT_CARD_FIXED_USD,
            'ach_percent' => self::DEFAULT_ACH_PERCENT,
            'ach_fee_cap_usd' => self::DEFAULT_ACH_FEE_CAP_USD,
        ];

        $stored = AdminSetting::get('stripe_processing_fee_estimates', null);
        if (! is_array($stored)) {
            $stored = AdminSetting::get('donation_fee_estimates', null);
        }
        if (! is_array($stored)) {
            self::$ratesCache = $defaults;

            return self::$ratesCache;
        }

        $merged = $defaults;
        foreach (array_keys($defaults) as $key) {
            if (isset($stored[$key]) && is_numeric($stored[$key])) {
                $merged[$key] = (float) $stored[$key];
            }
        }

        self::$ratesCache = $merged;

        return self::$ratesCache;
    }

    /**
     * @return array{card_percent: float, card_fixed_usd: float, ach_percent: float, ach_fee_cap_usd: float}
     */
    public static function ratesForFrontend(): array
    {
        return self::rates();
    }

    public static function estimateCardFeeOnChargeUsd(float $chargeUsd): float
    {
        $r = self::rates();
        $chargeUsd = max(0, $chargeUsd);

        return round($chargeUsd * $r['card_percent'] + $r['card_fixed_usd'], 2);
    }

    public static function estimateNetAfterCardFeeWhenOrgAbsorbsUsd(float $donationUsd): float
    {
        $fee = self::estimateCardFeeOnChargeUsd($donationUsd);

        return round(max(0, $donationUsd - $fee), 2);
    }

    public static function grossUpCardChargeUsdForNetGiftUsd(float $netGiftUsd): float
    {
        $r = self::rates();
        $netGiftUsd = max(0, $netGiftUsd);
        if ($netGiftUsd <= 0) {
            return 0.0;
        }
        $p = $r['card_percent'];
        if ($p >= 1) {
            return round($netGiftUsd + $r['card_fixed_usd'], 2);
        }

        return round(($netGiftUsd + $r['card_fixed_usd']) / (1 - $p), 2);
    }

    public static function feeAddonWhenDonorCoversUsd(float $netGiftUsd): float
    {
        $gross = self::grossUpCardChargeUsdForNetGiftUsd($netGiftUsd);
        $netGiftUsd = max(0, $netGiftUsd);

        return round(max(0, $gross - $netGiftUsd), 2);
    }

    public static function estimateAchFeeOnChargeUsd(float $chargeUsd): float
    {
        $r = self::rates();
        $chargeUsd = max(0, $chargeUsd);

        return round(min($chargeUsd * $r['ach_percent'], $r['ach_fee_cap_usd']), 2);
    }

    public static function estimateNetAfterAchFeeWhenOrgAbsorbsUsd(float $donationUsd): float
    {
        $fee = self::estimateAchFeeOnChargeUsd($donationUsd);

        return round(max(0, $donationUsd - $fee), 2);
    }

    public static function grossUpAchChargeUsdForNetGiftUsd(float $netGiftUsd): float
    {
        $r = self::rates();
        $netGiftUsd = max(0, $netGiftUsd);
        if ($netGiftUsd <= 0) {
            return 0.0;
        }
        $achPct = $r['ach_percent'];
        $cap = $r['ach_fee_cap_usd'];
        if ($achPct >= 1) {
            return round($netGiftUsd + $cap, 2);
        }

        $cLinear = $netGiftUsd / (1 - $achPct);
        if (($cLinear * $achPct) <= $cap + 0.000001) {
            return round($cLinear, 2);
        }

        return round($netGiftUsd + $cap, 2);
    }

    public static function feeAddonWhenDonorCoversAchUsd(float $netGiftUsd): float
    {
        $gross = self::grossUpAchChargeUsdForNetGiftUsd($netGiftUsd);
        $netGiftUsd = max(0, $netGiftUsd);

        return round(max(0, $gross - $netGiftUsd), 2);
    }
}
