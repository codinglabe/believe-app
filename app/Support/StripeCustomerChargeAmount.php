<?php

namespace App\Support;

use App\Services\StripeProcessingFeeEstimator;

/**
 * Converts a net USD amount (what you want after estimated Stripe fees) into charge cents for Checkout / PaymentIntents.
 */
final class StripeCustomerChargeAmount
{
    /**
     * Whole charge amount in cents (Stripe integer amount).
     */
    public static function chargeCentsFromNetUsd(float $netUsd, string $rail = 'card'): int
    {
        $p = StripeProcessingFeeEstimator::applyPassThroughIfEnabled($netUsd, $rail);

        return (int) round($p['gross_usd'] * 100);
    }

    /**
     * @return array{net_usd: float, gross_usd: float, fee_addon_usd: float, charge_cents: int}
     */
    public static function breakdownFromNetUsd(float $netUsd, string $rail = 'card'): array
    {
        $p = StripeProcessingFeeEstimator::applyPassThroughIfEnabled($netUsd, $rail);

        return [
            'net_usd' => $p['net_usd'],
            'gross_usd' => $p['gross_usd'],
            'fee_addon_usd' => $p['fee_addon_usd'],
            'charge_cents' => (int) round($p['gross_usd'] * 100),
        ];
    }
}
