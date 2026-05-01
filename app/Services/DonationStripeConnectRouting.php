<?php

namespace App\Services;

use App\Models\CareAlliance;
use App\Models\Organization;

/**
 * Routes “plain” org one-time Stripe gifts through Connect when the recipient is ready.
 * Care Alliance flows with financial distribution stay on the platform checkout path.
 */
final class DonationStripeConnectRouting
{
    public static function shouldRouteThroughStripeConnect(
        Organization $organization,
        ?CareAlliance $allianceForCheckout,
        string $frequency,
        string $paymentMethod
    ): bool {
        if ($paymentMethod !== 'stripe') {
            return false;
        }
        if ($frequency !== 'one-time') {
            return false;
        }

        if ($allianceForCheckout !== null && $allianceForCheckout->financial_settings_completed_at) {
            return false;
        }

        return StripeConnectOrganizationService::organizationCanAcceptDirectDonations($organization);
    }

    public static function requireConnectPerConfig(): bool
    {
        return (bool) config('donations.require_org_stripe_connect_for_direct_donations', false);
    }
}
