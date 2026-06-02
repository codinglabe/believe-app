<?php

namespace App\Services;

/**
 * Gift card revenue: face-value sales with no buyer platform fee.
 * Provider (Phaze) commission is split — BIU share % and remainder to the beneficiary organization.
 * Merchant revenue is always zero (no merchant pool on gift cards).
 */
final class GiftCardRevenueShareService
{
    public const DEFAULT_BIU_SHARE_PERCENTAGE = 10.0;

    public static function getBiuSharePercentage(): float
    {
        $v = config('services.phaze.gift_card_biu_revenue_share_percentage');
        if ($v === null || $v === '') {
            $v = config('services.phaze.gift_card_platform_commission_percentage', self::DEFAULT_BIU_SHARE_PERCENTAGE);
        }

        return max(0.0, min(100.0, (float) $v));
    }

    /**
     * Provider commission from a Phaze purchase / webhook payload.
     *
     * @return array{provider_commission: float|null, commission_percentage: float|null}
     */
    public static function resolveProviderCommission(array $phazePayload, float $purchaseAmount): array
    {
        $providerCommission = null;
        $commissionPercentage = null;

        if (isset($phazePayload['commission']) && is_numeric($phazePayload['commission'])) {
            $providerCommission = (float) $phazePayload['commission'];
        } elseif (isset($phazePayload['phazeCommission']) && is_numeric($phazePayload['phazeCommission'])) {
            $providerCommission = (float) $phazePayload['phazeCommission'];
        } elseif (isset($phazePayload['commissionAmount']) && is_numeric($phazePayload['commissionAmount'])) {
            $providerCommission = (float) $phazePayload['commissionAmount'];
        }

        if ($providerCommission !== null && $providerCommission > 0 && $purchaseAmount > 0) {
            $commissionPercentage = ($providerCommission / $purchaseAmount) * 100;
        }

        if ($providerCommission === null) {
            $commissionPercentage = $phazePayload['commissionPercentage']
                ?? $phazePayload['commission_percentage']
                ?? null;

            if ($commissionPercentage !== null && is_numeric($commissionPercentage) && $purchaseAmount > 0) {
                $providerCommission = ($purchaseAmount * (float) $commissionPercentage) / 100;
            }
        }

        return [
            'provider_commission' => $providerCommission,
            'commission_percentage' => $commissionPercentage !== null ? (float) $commissionPercentage : null,
        ];
    }

    /**
     * Split provider commission into BIU, organization, and merchant buckets.
     *
     * @return array{
     *   commission_percentage: float|null,
     *   total_commission: float|null,
     *   platform_commission: float|null,
     *   nonprofit_commission: float|null,
     *   merchant_revenue: float,
     *   biu_share_percentage: float,
     *   commission_calculation: array<string, mixed>
     * }
     */
    public static function splitProviderCommission(
        ?float $providerCommission,
        ?float $commissionPercentage = null
    ): array {
        $biuPct = self::getBiuSharePercentage();
        $platformCommission = null;
        $nonprofitCommission = null;
        $merchantRevenue = 0.0;

        if ($providerCommission !== null && $providerCommission > 0) {
            $platformCommission = round($providerCommission * $biuPct / 100, 8);
            $nonprofitCommission = round($providerCommission - $platformCommission, 8);
        }

        return [
            'commission_percentage' => $commissionPercentage,
            'total_commission' => $providerCommission,
            'platform_commission' => $platformCommission,
            'nonprofit_commission' => $nonprofitCommission,
            'merchant_revenue' => $merchantRevenue,
            'biu_share_percentage' => $biuPct,
            'commission_calculation' => [
                'provider_commission' => $providerCommission,
                'commission_percentage' => $commissionPercentage,
                'biu_revenue_share_percentage' => $biuPct,
                'biu_revenue_share' => $platformCommission,
                'organization_revenue' => $nonprofitCommission,
                'merchant_revenue' => $merchantRevenue,
                'gift_card_sales_basis' => 'face_value_no_buyer_platform_fee',
            ],
        ];
    }

    /**
     * @return array{
     *   commission_percentage: float|null,
     *   total_commission: float|null,
     *   platform_commission: float|null,
     *   nonprofit_commission: float|null,
     *   merchant_revenue: float,
     *   biu_share_percentage: float,
     *   commission_calculation: array<string, mixed>
     * }
     */
    public static function calculateFromPhazeResponse(?array $phazePayload, float $purchaseAmount): array
    {
        if ($phazePayload === null || $phazePayload === []) {
            return self::splitProviderCommission(null, null);
        }

        $resolved = self::resolveProviderCommission($phazePayload, $purchaseAmount);

        return self::splitProviderCommission(
            $resolved['provider_commission'],
            $resolved['commission_percentage']
        );
    }

    /**
     * Ledger / export meta: no buyer BIU platform fee; commission splits when known.
     *
     * @return array<string, float|null>
     */
    public static function ledgerMetaSlice(float $saleAmount, ?float $providerCommission = null, ?float $biuShare = null, ?float $organizationRevenue = null, ?float $merchantRevenue = null): array
    {
        $g = round(max(0.0, $saleAmount), 2);
        $merchant = round(max(0.0, (float) ($merchantRevenue ?? 0)), 2);
        $biu = $biuShare !== null ? round(max(0.0, $biuShare), 2) : null;
        $org = $organizationRevenue !== null ? round(max(0.0, $organizationRevenue), 2) : null;
        $provider = $providerCommission !== null ? round(max(0.0, $providerCommission), 2) : null;

        $meta = [
            'gross_amount' => $g,
            'subtotal' => $g,
            'amount_gross' => $g,
            'gift_card_sales' => $g,
            'biu_fee' => 0.0,
            'believe_biu_fee' => 0.0,
            'platform_fee' => 0.0,
            'merchant_revenue' => $merchant,
            'merchant_payout' => $merchant,
            'supplier_payout' => 0.0,
        ];

        if ($provider !== null) {
            $meta['provider_commission'] = $provider;
        }
        if ($biu !== null) {
            $meta['biu_revenue_share'] = $biu;
            $meta['platform_payout'] = $biu;
        }
        if ($org !== null) {
            $meta['organization_revenue'] = $org;
            $meta['organization_payout'] = $org;
        }

        return $meta;
    }

    /**
     * @return array{
     *   gift_card_sales: float,
     *   provider_commissions: float,
     *   biu_revenue_share: float,
     *   organization_revenue: float,
     *   merchant_revenue: float,
     *   purchase_count: int,
     *   biu_share_percentage: float
     * }
     */
    public static function aggregateStatistics(?\DateTimeInterface $from = null, ?\DateTimeInterface $to = null): array
    {
        $query = \App\Models\GiftCard::query()
            ->whereNotNull('purchased_at')
            ->where('status', '!=', 'failed');

        if ($from !== null) {
            $query->where('purchased_at', '>=', $from);
        }
        if ($to !== null) {
            $query->where('purchased_at', '<=', $to);
        }

        return [
            'gift_card_sales' => (float) (clone $query)->sum('amount'),
            'provider_commissions' => (float) (clone $query)->sum('total_commission'),
            'biu_revenue_share' => (float) (clone $query)->sum('platform_commission'),
            'organization_revenue' => (float) (clone $query)->sum('nonprofit_commission'),
            'merchant_revenue' => (float) (clone $query)->sum('merchant_revenue'),
            'purchase_count' => (int) (clone $query)->count(),
            'biu_share_percentage' => self::getBiuSharePercentage(),
        ];
    }
}
