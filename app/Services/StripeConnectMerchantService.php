<?php

namespace App\Services;

use App\Models\Merchant;
use Illuminate\Support\Facades\Log;
use Laravel\Cashier\Cashier;

class StripeConnectMerchantService
{
    public static function configureStripe(): bool
    {
        if (StripeConfigService::configureStripe()) {
            return true;
        }

        $envSecret = (string) (config('cashier.secret') ?? '');

        return $envSecret !== '';
    }

    public static function syncAccountStatusFromStripe(Merchant $merchant): ?string
    {
        if ($merchant->stripe_connect_account_id === null || $merchant->stripe_connect_account_id === '') {
            return null;
        }
        if (! self::configureStripe()) {
            return 'Stripe credentials are not configured for this application.';
        }

        try {
            $acct = Cashier::stripe()->accounts->retrieve($merchant->stripe_connect_account_id);
            $merchant->forceFill([
                'stripe_connect_charges_enabled' => (bool) ($acct->charges_enabled ?? false),
                'stripe_connect_payouts_enabled' => (bool) ($acct->payouts_enabled ?? false),
                'stripe_connect_account_type' => isset($acct->type) ? (string) $acct->type : null,
            ])->save();

            return null;
        } catch (\Throwable $e) {
            Log::warning('Stripe Connect merchant account retrieve failed', [
                'merchant_id' => $merchant->id,
                'stripe_connect_account_id' => $merchant->stripe_connect_account_id,
                'error' => $e->getMessage(),
            ]);

            return StripeConnectOrganizationService::humanizeStripeError($e);
        }
    }

    /**
     * Create (or reuse) a Standard connected account for the merchant.
     *
     * @return non-empty-string
     */
    public static function createStandardAccountIfMissing(Merchant $merchant): string
    {
        if (! self::configureStripe()) {
            throw new \RuntimeException('Stripe credentials are not configured for this application.');
        }

        $stripe = Cashier::stripe();
        $email = trim((string) ($merchant->email ?? ''));
        if ($email === '') {
            throw new \RuntimeException('Merchant must have an email address on file before connecting Stripe payouts.');
        }

        if ($merchant->stripe_connect_account_id !== null && $merchant->stripe_connect_account_id !== '') {
            self::syncAccountStatusFromStripe($merchant);
            $merchant->refresh();

            if (self::isLegacyExpressAccount($merchant)) {
                throw new \RuntimeException(
                    'This merchant is linked to a legacy Express Stripe account. Disconnect it first, then connect again to create a Standard account with the full Stripe Dashboard.'
                );
            }

            return $merchant->stripe_connect_account_id;
        }

        $country = strtoupper(trim((string) ($merchant->country ?? 'US')));
        if ($country === '' || strlen($country) !== 2) {
            $country = 'US';
        }

        try {
            $account = $stripe->accounts->create([
                'type' => 'standard',
                'country' => $country,
                'email' => $email,
                'capabilities' => [
                    'card_payments' => ['requested' => true],
                    'transfers' => ['requested' => true],
                ],
                'business_type' => 'company',
                'metadata' => [
                    'merchant_id' => (string) $merchant->id,
                    'merchant_name' => mb_substr((string) ($merchant->business_name ?: $merchant->name), 0, 250),
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('Stripe Connect merchant Standard account create failed', [
                'merchant_id' => $merchant->id,
                'error' => $e->getMessage(),
            ]);

            throw new \RuntimeException(StripeConnectOrganizationService::humanizeStripeError($e), 0, $e);
        }

        $merchant->forceFill([
            'stripe_connect_account_id' => $account->id,
            'stripe_connect_account_type' => 'standard',
        ])->save();

        self::syncAccountStatusFromStripe($merchant);

        return $account->id;
    }

    /**
     * Stripe Connect Onboarding link for a Standard account.
     *
     * @return non-empty-string
     */
    public static function createAccountOnboardingLink(Merchant $merchant): string
    {
        if (! self::configureStripe()) {
            throw new \RuntimeException('Stripe credentials are not configured for this application.');
        }

        $accountId = self::createStandardAccountIfMissing($merchant);

        try {
            $link = Cashier::stripe()->accountLinks->create([
                'account' => $accountId,
                'refresh_url' => route('merchant.payouts.stripe-connect.refresh'),
                'return_url' => route('merchant.payouts.stripe-connect.return'),
                'type' => 'account_onboarding',
            ]);
        } catch (\Throwable $e) {
            Log::error('Stripe Connect merchant account link create failed', [
                'merchant_id' => $merchant->id,
                'stripe_connect_account_id' => $accountId,
                'error' => $e->getMessage(),
            ]);

            throw new \RuntimeException(StripeConnectOrganizationService::humanizeStripeError($e), 0, $e);
        }

        return $link->url;
    }

    public static function disconnectAccount(Merchant $merchant): void
    {
        $merchant->forceFill([
            'stripe_connect_account_id' => null,
            'stripe_connect_charges_enabled' => false,
            'stripe_connect_payouts_enabled' => false,
            'stripe_connect_account_type' => null,
        ])->save();
    }

    public static function isLegacyExpressAccount(Merchant $merchant): bool
    {
        $type = strtolower(trim((string) ($merchant->stripe_connect_account_type ?? '')));

        return $type === 'express' || $type === 'custom';
    }

    public static function merchantCanReceivePayouts(Merchant $merchant): bool
    {
        if ($merchant->stripe_connect_account_id === null || $merchant->stripe_connect_account_id === '') {
            return false;
        }

        if (self::isLegacyExpressAccount($merchant)) {
            return false;
        }

        return $merchant->stripe_connect_charges_enabled && $merchant->stripe_connect_payouts_enabled;
    }
}
