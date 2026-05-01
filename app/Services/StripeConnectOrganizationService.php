<?php

namespace App\Services;

use App\Models\Organization;
use Illuminate\Support\Facades\Log;
use Laravel\Cashier\Cashier;

class StripeConnectOrganizationService
{
    public static function configureStripe(): bool
    {
        return StripeConfigService::configureStripe();
    }

    /**
     * Pull charges/payouts flags from Stripe and persist locally.
     */
    public static function syncAccountStatusFromStripe(Organization $organization): void
    {
        if ($organization->stripe_connect_account_id === null || $organization->stripe_connect_account_id === '') {
            return;
        }
        if (! self::configureStripe()) {
            return;
        }

        try {
            $acct = Cashier::stripe()->accounts->retrieve($organization->stripe_connect_account_id);
            $organization->forceFill([
                'stripe_connect_charges_enabled' => (bool) ($acct->charges_enabled ?? false),
                'stripe_connect_payouts_enabled' => (bool) ($acct->payouts_enabled ?? false),
            ])->save();
        } catch (\Throwable $e) {
            Log::warning('Stripe Connect account retrieve failed', [
                'organization_id' => $organization->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * @return non-empty-string
     */
    public static function createExpressAccountIfMissing(Organization $organization): string
    {
        self::configureStripe();

        $organization->loadMissing('user');
        $stripe = Cashier::stripe();

        $email = trim((string) ($organization->email ?: $organization->platform_email ?: $organization->user?->email ?: ''));
        if ($email === '') {
            throw new \RuntimeException('Organization must have an email before connecting Stripe payouts.');
        }

        if ($organization->stripe_connect_account_id !== null && $organization->stripe_connect_account_id !== '') {
            self::syncAccountStatusFromStripe($organization);

            return $organization->stripe_connect_account_id;
        }

        $account = $stripe->accounts->create([
            'type' => 'express',
            'country' => 'US',
            'email' => $email,
            'capabilities' => [
                'card_payments' => ['requested' => true],
                'transfers' => ['requested' => true],
            ],
        ]);

        $organization->forceFill([
            'stripe_connect_account_id' => $account->id,
        ])->save();

        self::syncAccountStatusFromStripe($organization);

        return $account->id;
    }

    public static function createAccountOnboardingLink(Organization $organization): string
    {
        self::configureStripe();
        $accountId = self::createExpressAccountIfMissing($organization);

        $link = Cashier::stripe()->accountLinks->create([
            'account' => $accountId,
            'refresh_url' => route('integrations.stripe-connect.refresh'),
            'return_url' => route('integrations.stripe-connect.return'),
            'type' => 'account_onboarding',
        ]);

        return $link->url;
    }

    public static function organizationCanAcceptDirectDonations(Organization $organization): bool
    {
        if ($organization->stripe_connect_account_id === null || $organization->stripe_connect_account_id === '') {
            return false;
        }

        return $organization->stripe_connect_charges_enabled && $organization->stripe_connect_payouts_enabled;
    }
}
