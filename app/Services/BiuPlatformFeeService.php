<?php

namespace App\Services;

use App\Models\AdminSetting;

/**
 * BIU platform fee % for all sales modules (marketplace, service hub, courses, raffles, gift cards, merchant hub).
 *
 * Applied to the sale base amount (product subtotal, ticket total, course fee, gift card face paid, merchant cash spent — not tax/shipping).
 * Marketplace: when {@see MarketplaceOrganizationMarkupService} yields organization markup &gt; 0, pass that as the base so the fee is taken from org profit/margin, not from supplier portions.
 * Not added to what the buyer pays; recorded for splits and the transaction ledger (client workbook: platform_fee deducted from margin).
 */
final class BiuPlatformFeeService
{
    /** Canonical admin setting (single knob on /admin/biu-fee). */
    public const SETTING_KEY_SALES = 'biu_sales_platform_fee_percentage';

    /** @deprecated Fallback only */
    public const SETTING_KEY_MARKETPLACE_LEGACY = 'biu_marketplace_platform_fee_percentage';

    /** @deprecated Fallback only — Service Hub previously used this key */
    public const SETTING_KEY_SERVICE_HUB_LEGACY = 'service_hub_platform_fee_percentage';

    public static function getSalesPlatformFeePercentage(): float
    {
        $v = AdminSetting::get(self::SETTING_KEY_SALES);
        if ($v !== null && $v !== '') {
            return max(0.0, min(100.0, (float) $v));
        }
        $v2 = AdminSetting::get(self::SETTING_KEY_MARKETPLACE_LEGACY);
        if ($v2 !== null && $v2 !== '') {
            return max(0.0, min(100.0, (float) $v2));
        }
        $v3 = AdminSetting::get(self::SETTING_KEY_SERVICE_HUB_LEGACY);
        if ($v3 !== null && $v3 !== '') {
            return max(0.0, min(100.0, (float) $v3));
        }

        return 0.0;
    }

    public static function platformFeeFromAmount(float $saleBaseUsd): float
    {
        $pct = self::getSalesPlatformFeePercentage();

        return round(max(0.0, $saleBaseUsd) * ($pct / 100), 2);
    }

    /**
     * Merge into wallet {@see Transaction} meta for ledger / exports.
     *
     * @return array<string, float>
     */
    public static function ledgerMetaSlice(float $saleBaseUsd): array
    {
        $pf = self::platformFeeFromAmount($saleBaseUsd);
        $g = round(max(0.0, $saleBaseUsd), 2);

        return [
            'gross_amount' => $g,
            'subtotal' => $g,
            'amount_gross' => $g,
            'biu_fee' => $pf,
            'believe_biu_fee' => $pf,
            'platform_fee' => $pf,
        ];
    }
}
