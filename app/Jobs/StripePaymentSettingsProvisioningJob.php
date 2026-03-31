<?php

namespace App\Jobs;

use App\Models\PaymentMethod;
use App\Models\User;
use App\Services\StripeAdminProvisioningService;
use App\Services\StripeConfigService;
use App\Services\StripeEnvironmentSyncService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class StripePaymentSettingsProvisioningJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Run once only — no retries (queue worker may pass --tries=N; this caps attempts).
     */
    public int $tries = 1;

    /**
     * Shown in `php artisan queue:work -v` output instead of the class name only.
     */
    public function displayName(): string
    {
        return 'Stripe payment settings provisioning';
    }

    /**
     * @param  array<string, mixed>  $context
     */
    public function __construct(
        public int $adminUserId,
        public string $activeEnvironment,
        public array $context = []
    ) {}

    public function handle(StripeAdminProvisioningService $provisioning): void
    {
        $user = User::find($this->adminUserId);
        if (! $user) {
            Log::warning('StripePaymentSettingsProvisioningJob: admin user not found', [
                'user_id' => $this->adminUserId,
            ]);

            return;
        }

        $stripe = PaymentMethod::getConfig('stripe');
        if (! $stripe) {
            return;
        }

        $updates = $this->stripeModelToConfigArray($stripe);

        if (! empty(trim((string) $stripe->test_secret_key))) {
            $cid = $provisioning->createOrFetchStripeCustomer(
                $stripe->test_secret_key,
                'test',
                $user
            );
            if ($cid) {
                $updates['test_customer_id'] = $cid;
            }
            $wh = $provisioning->fetchWebhookSecret($stripe->test_secret_key, 'test');
            if ($wh) {
                $updates['test_webhook_secret'] = $wh;
            }
        }

        if (! empty(trim((string) $stripe->live_secret_key))) {
            $cid = $provisioning->createOrFetchStripeCustomer(
                $stripe->live_secret_key,
                'live',
                $user
            );
            if ($cid) {
                $updates['live_customer_id'] = $cid;
            }
            $wh = $provisioning->fetchWebhookSecret($stripe->live_secret_key, 'live');
            if ($wh) {
                $updates['live_webhook_secret'] = $wh;
            }
        }

        PaymentMethod::setConfig('stripe', $updates);

        $stripe = PaymentMethod::getConfig('stripe');
        if (! $stripe) {
            return;
        }

        // Single Stripe "mode" per DB row for plans/prices — sync the account that matches admin mode (sandbox|live).
        $environment = $this->normalizeActiveEnvironment($this->activeEnvironment);
        $credentials = StripeConfigService::getCredentials($environment);

        if (! $credentials || empty($credentials['secret_key']) || empty($credentials['publishable_key'])) {
            Log::info('StripePaymentSettingsProvisioningJob: active mode has no complete key pair — skip full sync', [
                'environment' => $environment,
            ]);

            return;
        }

        if (! StripeConfigService::configureStripe($environment)) {
            Log::error('StripePaymentSettingsProvisioningJob: configureStripe failed', [
                'environment' => $environment,
            ]);

            return;
        }

        try {
            Log::info('Stripe full provisioning (queued job)', array_merge([
                'active_environment' => $this->activeEnvironment,
                'sync_environment' => $environment,
            ], $this->context));

            $syncResults = StripeEnvironmentSyncService::syncAll($environment);

            Log::info('Stripe full provisioning completed (queued job)', [
                'environment' => $environment,
                'results' => $syncResults,
            ]);
        } catch (\Throwable $e) {
            Log::error('Stripe full provisioning failed (queued job)', [
                'environment' => $environment,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    private function normalizeActiveEnvironment(string $activeEnvironment): string
    {
        return $activeEnvironment === 'live' ? 'live' : 'sandbox';
    }

    /**
     * @return array<string, mixed>
     */
    private function stripeModelToConfigArray(PaymentMethod $s): array
    {
        return [
            'mode_environment' => $s->mode_environment,
            'test_publishable_key' => $s->test_publishable_key,
            'test_secret_key' => $s->test_secret_key,
            'test_customer_id' => $s->test_customer_id,
            'test_webhook_secret' => $s->test_webhook_secret,
            'live_publishable_key' => $s->live_publishable_key,
            'live_secret_key' => $s->live_secret_key,
            'live_customer_id' => $s->live_customer_id,
            'live_webhook_secret' => $s->live_webhook_secret,
            'test_donation_product_id' => $s->test_donation_product_id,
            'live_donation_product_id' => $s->live_donation_product_id,
        ];
    }
}
