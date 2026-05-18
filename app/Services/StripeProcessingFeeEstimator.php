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

    /**
     * Whether {@see applyPassThroughIfEnabled()} will gross up charges (config-driven).
     */
    public static function customerPaysProcessingFeeEnabled(): bool
    {
        return (bool) config('services.stripe.customer_pays_processing_fee', false);
    }

    /**
     * Gross up a net basket/service total so estimated Stripe fees are paid by the customer.
     *
     * @return array{net_usd: float, gross_usd: float, fee_addon_usd: float}
     */
    public static function applyPassThroughIfEnabled(float $netUsd, string $rail = 'card'): array
    {
        $net = round(max(0, $netUsd), 2);
        if ($net <= 0) {
            return ['net_usd' => 0.0, 'gross_usd' => 0.0, 'fee_addon_usd' => 0.0];
        }
        if (! self::customerPaysProcessingFeeEnabled()) {
            return ['net_usd' => $net, 'gross_usd' => $net, 'fee_addon_usd' => 0.0];
        }

        return self::applyPassThrough($net, $rail);
    }

    /**
     * Gross up a net basket/service total so estimated Stripe fees are paid by the customer,
     * regardless of any feature flag / config.
     *
     * @return array{net_usd: float, gross_usd: float, fee_addon_usd: float}
     */
    public static function applyPassThrough(float $netUsd, string $rail = 'card'): array
    {
        $net = round(max(0, $netUsd), 2);
        if ($net <= 0) {
            return ['net_usd' => 0.0, 'gross_usd' => 0.0, 'fee_addon_usd' => 0.0];
        }
        $gross = $rail === 'us_bank_account'
            ? self::grossUpAchChargeUsdForNetGiftUsd($net)
            : self::grossUpCardChargeUsdForNetGiftUsd($net);
        $gross = round($gross, 2);

        return [
            'net_usd' => $net,
            'gross_usd' => $gross,
            'fee_addon_usd' => round(max(0, $gross - $net), 2),
        ];
    }

    /**
     * Same fee breakdown as /donate (donor covers vs org absorbs). Used by donate page and raffle checkout preview.
     *
     * @return array{mode: string, rail: string, base_gift_usd: float, checkout_total_usd: float, processing_fee_estimate: float, estimated_net_to_org_usd: float}
     */
    public static function giftFeePreviewPayload(float $base, bool $donorCovers, string $rail = 'card'): array
    {
        $rail = in_array($rail, ['card', 'bank'], true) ? $rail : 'card';

        if ($donorCovers) {
            if ($rail === 'bank') {
                $checkoutTotal = self::grossUpAchChargeUsdForNetGiftUsd($base);
                $feeAddon = self::feeAddonWhenDonorCoversAchUsd($base);
            } else {
                $checkoutTotal = self::grossUpCardChargeUsdForNetGiftUsd($base);
                $feeAddon = self::feeAddonWhenDonorCoversUsd($base);
            }

            return [
                'mode' => 'donor_covers',
                'rail' => $rail,
                'base_gift_usd' => $base,
                'checkout_total_usd' => round($checkoutTotal, 2),
                'processing_fee_estimate' => round($feeAddon, 2),
                'estimated_net_to_org_usd' => $base,
            ];
        }

        if ($rail === 'bank') {
            $fee = self::estimateAchFeeOnChargeUsd($base);
            $net = self::estimateNetAfterAchFeeWhenOrgAbsorbsUsd($base);
        } else {
            $fee = self::estimateCardFeeOnChargeUsd($base);
            $net = self::estimateNetAfterCardFeeWhenOrgAbsorbsUsd($base);
        }

        return [
            'mode' => 'org_covers',
            'rail' => $rail,
            'base_gift_usd' => $base,
            'checkout_total_usd' => $base,
            'processing_fee_estimate' => round($fee, 2),
            'estimated_net_to_org_usd' => $net,
        ];
    }
}
