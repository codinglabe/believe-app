<?php

namespace App\Services;

use App\Models\PaymentMethod;
use App\Models\User;
use Illuminate\Support\Facades\Log;

/**
 * Runs immediately when admin saves Settings → Payment Methods (Stripe).
 * Creates Cashier webhook, platform customer, donation product, and syncs catalog for active mode.
 */
final class StripePaymentSettingsProvisioningService
{
    public function __construct(
        private readonly StripeAdminProvisioningService $stripeAdminProvisioning,
    ) {}

    /**
     * @return array{
     *     success: bool,
     *     message: string,
     *     environments: array<string, array<string, mixed>>,
     *     catalog_sync: array<string, mixed>|null
     * }
     */
    public function provisionAfterAdminSave(
        int $adminUserId,
        string $activeEnvironment,
        bool $credentialsOrEnvironmentChanged,
        bool $runCatalogSync = true,
    ): array {
        $user = User::query()->find($adminUserId);
        if (! $user) {
            return [
                'success' => false,
                'message' => 'Admin user not found; Stripe was not provisioned.',
                'environments' => [],
                'catalog_sync' => null,
            ];
        }

        $stripe = PaymentMethod::getConfig('stripe');
        if (! $stripe) {
            return [
                'success' => false,
                'message' => 'Stripe payment method record missing.',
                'environments' => [],
                'catalog_sync' => null,
            ];
        }

        $updates = $this->stripeRowToConfigArray($stripe);
        $environmentResults = [];

        foreach (['sandbox', 'test', 'live'] as $environment) {
            $secretKey = trim((string) ($stripe->{"{$environment}_secret_key"} ?? ''));
            $publishableKey = trim((string) ($stripe->{"{$environment}_publishable_key"} ?? ''));

            if ($secretKey === '' || $publishableKey === '') {
                continue;
            }

            $storedWebhookSecret = trim((string) ($stripe->{"{$environment}_webhook_secret"} ?? ''));

            $forceWebhook = $credentialsOrEnvironmentChanged || $storedWebhookSecret === '';

            $environmentResults[$environment] = $this->provisionEnvironment(
                $secretKey,
                $environment,
                $user,
                $forceWebhook,
                $storedWebhookSecret !== '' ? $storedWebhookSecret : null,
            );

            $result = $environmentResults[$environment];
            if (! empty($result['customer_id'])) {
                $updates["{$environment}_customer_id"] = $result['customer_id'];
            }
            if (! empty($result['account_id'])) {
                $updates["{$environment}_account_id"] = $result['account_id'];
            }
            if (! empty($result['webhook_secret'])) {
                $updates["{$environment}_webhook_secret"] = $result['webhook_secret'];
            }
            if (! empty($result['donation_product_id'])) {
                $updates[StripeConfigService::donationProductColumn($environment)] = $result['donation_product_id'];
            }
        }

        PaymentMethod::setConfig('stripe', $updates);

        $catalogSync = null;

        if ($runCatalogSync) {
            try {
                $catalogSync = $this->syncActiveEnvironmentCatalog($activeEnvironment);
            } catch (\Throwable $e) {
                Log::error('Stripe catalog sync failed after admin save', [
                    'environment' => $activeEnvironment,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $stripe = PaymentMethod::getConfig('stripe');
        $activeEnvironment = $this->normalizeEnvironment($activeEnvironment);
        $activeWebhookSecret = trim((string) ($stripe?->{"{$activeEnvironment}_webhook_secret"} ?? ''));
        $keysOk = StripeConfigService::getCredentials($activeEnvironment) !== null;
        $webhookOk = $activeWebhookSecret !== '';

        $message = $keysOk
            ? ($webhookOk
                ? 'Stripe saved. Webhook, customer, and donation product were created automatically — no Stripe Dashboard setup needed.'
                : 'Stripe keys saved, but the Cashier webhook signing secret could not be created. Confirm APP_URL is correct and save again.')
            : 'Stripe settings saved. Add publishable and secret keys for your active mode, then save again to auto-create everything.';

        if (is_array($catalogSync) && ! ($catalogSync['skipped'] ?? false)) {
            $message .= ' Plans and subscriptions were synced to Stripe for the active mode.';
        }

        return [
            'success' => $keysOk && $webhookOk,
            'message' => $message,
            'environments' => $environmentResults,
            'catalog_sync' => $catalogSync,
        ];
    }

    /**
     * @return array{
     *     customer_id: string|null,
     *     account_id: string|null,
     *     webhook_secret: string|null,
     *     webhook_configured: bool,
     *     webhook_id: string|null,
     *     donation_product_id: string|null
     * }
     */
    public function provisionEnvironment(
        string $secretKey,
        string $environment,
        User $user,
        bool $forceWebhookRecreate = false,
        ?string $storedWebhookSecret = null,
    ): array {
        $customerId = $this->stripeAdminProvisioning->createOrFetchStripeCustomer(
            $secretKey,
            $environment,
            $user,
        );

        $accountId = StripeConfigService::resolveAccountIdWithSecretKey($secretKey);

        $webhook = $this->stripeAdminProvisioning->ensureCashierWebhook(
            $secretKey,
            $environment,
            $forceWebhookRecreate,
        );

        $effectiveWebhookSecret = $webhook['secret']
            ?? ((! $forceWebhookRecreate && is_string($storedWebhookSecret) && $storedWebhookSecret !== '')
                ? $storedWebhookSecret
                : null);

        $donationProductId = null;
        if (StripeConfigService::configureStripe($environment)) {
            $donationProductId = StripeConfigService::getDonationProductId($environment);
        }

        return [
            'customer_id' => $customerId,
            'account_id' => $accountId,
            'webhook_secret' => $effectiveWebhookSecret,
            'webhook_configured' => is_string($effectiveWebhookSecret) && $effectiveWebhookSecret !== '',
            'webhook_id' => $webhook['id'] ?? null,
            'donation_product_id' => $donationProductId,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function syncActiveEnvironmentCatalog(string $environment): array
    {
        $environment = $this->normalizeEnvironment($environment);
        $credentials = StripeConfigService::getCredentials($environment);

        if (! $credentials || empty($credentials['secret_key']) || empty($credentials['publishable_key'])) {
            return ['skipped' => true, 'reason' => 'incomplete_credentials'];
        }

        if (! StripeConfigService::configureStripe($environment)) {
            return ['skipped' => true, 'reason' => 'configure_failed'];
        }

        return StripeEnvironmentSyncService::syncAll($environment);
    }

    private function normalizeEnvironment(string $environment): string
    {
        $environment = strtolower(trim($environment));

        return in_array($environment, ['sandbox', 'test', 'live'], true) ? $environment : 'sandbox';
    }

    /**
     * @return array<string, mixed>
     */
    private function stripeRowToConfigArray(PaymentMethod $stripe): array
    {
        return [
            'mode_environment' => $stripe->mode_environment,
            'sandbox_publishable_key' => $stripe->sandbox_publishable_key,
            'sandbox_secret_key' => $stripe->sandbox_secret_key,
            'sandbox_customer_id' => $stripe->sandbox_customer_id,
            'sandbox_account_id' => $stripe->sandbox_account_id,
            'sandbox_webhook_secret' => $stripe->sandbox_webhook_secret,
            'test_publishable_key' => $stripe->test_publishable_key,
            'test_secret_key' => $stripe->test_secret_key,
            'test_customer_id' => $stripe->test_customer_id,
            'test_account_id' => $stripe->test_account_id,
            'test_webhook_secret' => $stripe->test_webhook_secret,
            'live_publishable_key' => $stripe->live_publishable_key,
            'live_secret_key' => $stripe->live_secret_key,
            'live_customer_id' => $stripe->live_customer_id,
            'live_account_id' => $stripe->live_account_id,
            'live_webhook_secret' => $stripe->live_webhook_secret,
            'sandbox_donation_product_id' => $stripe->sandbox_donation_product_id,
            'test_donation_product_id' => $stripe->test_donation_product_id,
            'live_donation_product_id' => $stripe->live_donation_product_id,
        ];
    }
}
