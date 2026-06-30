<?php

namespace App\Http\Controllers;

use App\Jobs\StripePaymentSettingsProvisioningJob;
use App\Models\PaymentMethod;
use App\Services\StripeAdminProvisioningService;
use App\Services\StripeConfigService;
use App\Services\StripeEnvironmentSyncService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class PaymentMethodSettingController extends Controller
{
    public function __construct()
    {
        // Only allow admin access
        $this->middleware('role:admin');
    }

    /**
     * Display the payment method settings page.
     */
    public function index()
    {
        // Double check admin authorization
        if (auth()->user()->role !== 'admin') {
            abort(403, 'Only administrators can access payment method settings.');
        }
        $paypal = PaymentMethod::getConfig('paypal');
        $stripe = PaymentMethod::getConfig('stripe');

        $settings = [
            'paypal_client_id' => $paypal->client_id ?? null,
            'paypal_client_secret' => $paypal->client_secret ?? null,
            'paypal_mode_environment' => $paypal->mode_environment ?? 'sandbox',

            'stripe_mode_environment' => $stripe->mode_environment ?? 'sandbox',

            // Sandbox credentials (Bridge Issuing / isolated sandbox account)
            'stripe_sandbox_publishable_key' => $stripe->sandbox_publishable_key ?? null,
            'stripe_sandbox_secret_key' => $stripe->sandbox_secret_key ?? null,
            'stripe_sandbox_customer_id' => $stripe->sandbox_customer_id ?? null,
            'stripe_sandbox_account_id' => $stripe->sandbox_account_id ?? null,

            // Test credentials
            'stripe_test_publishable_key' => $stripe->test_publishable_key ?? null,
            'stripe_test_secret_key' => $stripe->test_secret_key ?? null,
            'stripe_test_customer_id' => $stripe->test_customer_id ?? null,
            'stripe_test_account_id' => $stripe->test_account_id ?? null,

            // Separate live credentials
            'stripe_live_publishable_key' => $stripe->live_publishable_key ?? null,
            'stripe_live_secret_key' => $stripe->live_secret_key ?? null,
            'stripe_live_customer_id' => $stripe->live_customer_id ?? null,
            'stripe_live_account_id' => $stripe->live_account_id ?? null,

            'stripe_webhook_url' => StripeAdminProvisioningService::webhookEndpointUrl(),
            'stripe_webhook_events' => StripeAdminProvisioningService::requiredWebhookEvents(),
            'stripe_sandbox_webhook_configured' => ! empty($stripe->sandbox_webhook_secret),
            'stripe_test_webhook_configured' => ! empty($stripe->test_webhook_secret),
            'stripe_live_webhook_configured' => ! empty($stripe->live_webhook_secret),
        ];

        return Inertia::render('settings/payment-methods', [
            'settings' => $settings,
        ]);
    }

    /**
     * Update the payment method settings.
     */
    public function update(Request $request)
    {
        // Double check admin authorization
        if (auth()->user()->role !== 'admin') {
            abort(403, 'Only administrators can update payment method settings.');
        }

        $request->validate([
            'paypal_client_id' => ['nullable', 'string', 'max:255'],
            'paypal_client_secret' => ['nullable', 'string', 'max:255'],
            'paypal_mode_environment' => ['required', 'string', 'in:sandbox,live'],

            'stripe_mode_environment' => ['required', 'string', 'in:sandbox,test,live'],

            // Sandbox credentials
            'stripe_sandbox_publishable_key' => ['nullable', 'string', 'max:255'],
            'stripe_sandbox_secret_key' => ['nullable', 'string', 'max:255'],

            // Test credentials
            'stripe_test_publishable_key' => ['nullable', 'string', 'max:255'],
            'stripe_test_secret_key' => ['nullable', 'string', 'max:255'],

            // Live credentials
            'stripe_live_publishable_key' => ['nullable', 'string', 'max:255'],
            'stripe_live_secret_key' => ['nullable', 'string', 'max:255'],

            // Optional: paste signing secret from Stripe Dashboard (whsec_...) when auto-provision cannot read it
            'stripe_sandbox_webhook_secret' => ['nullable', 'string', 'max:255'],
            'stripe_test_webhook_secret' => ['nullable', 'string', 'max:255'],
            'stripe_live_webhook_secret' => ['nullable', 'string', 'max:255'],
        ]);

        PaymentMethod::setConfig('paypal', [
            'client_id' => $request->paypal_client_id,
            'client_secret' => $request->paypal_client_secret,
            'mode_environment' => $request->paypal_mode_environment,
        ]);

        // Check if Stripe environment or API keys changed (before updating config)
        $oldStripe = PaymentMethod::getConfig('stripe');
        $oldEnvironment = $oldStripe ? $oldStripe->mode_environment : null;
        $environmentChanged = $oldStripe && ($oldEnvironment !== $request->stripe_mode_environment);
        $credentialsChanged = $this->stripeCredentialsChanged($oldStripe, $request);
        $stripeCredentialsAddedFirstTime = ! $oldStripe && (
            trim((string) $request->stripe_sandbox_secret_key) !== ''
            || trim((string) $request->stripe_test_secret_key) !== ''
            || trim((string) $request->stripe_live_secret_key) !== ''
        );

        if ($oldStripe && ($credentialsChanged || $environmentChanged)) {
            try {
                StripeEnvironmentSyncService::resetLocalStripeLinkage();
            } catch (\Throwable $e) {
                Log::error('Failed to reset local Stripe linkage before credential update', [
                    'error' => $e->getMessage(),
                ]);
            }
        }

        // Prepare Stripe config (customer IDs and webhook secrets are filled by StripePaymentSettingsProvisioningJob)
        $stripeConfig = [
            'mode_environment' => $request->stripe_mode_environment,
            'sandbox_publishable_key' => $request->stripe_sandbox_publishable_key,
            'sandbox_secret_key' => $request->stripe_sandbox_secret_key,
            'test_publishable_key' => $request->stripe_test_publishable_key,
            'test_secret_key' => $request->stripe_test_secret_key,
            'live_publishable_key' => $request->stripe_live_publishable_key,
            'live_secret_key' => $request->stripe_live_secret_key,
        ];

        foreach (['sandbox', 'test', 'live'] as $environment) {
            $field = "{$environment}_webhook_secret";
            $submitted = trim((string) $request->input("stripe_{$field}", ''));
            if ($submitted !== '') {
                $stripeConfig[$field] = $submitted;
            } elseif ($oldStripe && ! $this->stripeEnvironmentKeysChanged($oldStripe, $request, $environment)) {
                $stripeConfig[$field] = $oldStripe->{$field};
            }
        }

        if ($oldStripe && $this->stripeSandboxKeysChanged($oldStripe, $request)) {
            $stripeConfig['sandbox_customer_id'] = null;
            $stripeConfig['sandbox_account_id'] = null;
            $stripeConfig['sandbox_webhook_secret'] = null;
            $stripeConfig['sandbox_donation_product_id'] = null;
        }

        if ($oldStripe && $this->stripeTestKeysChanged($oldStripe, $request)) {
            $stripeConfig['test_customer_id'] = null;
            $stripeConfig['test_account_id'] = null;
            $stripeConfig['test_webhook_secret'] = null;
            $stripeConfig['test_donation_product_id'] = null;
        }

        if ($oldStripe && $this->stripeLiveKeysChanged($oldStripe, $request)) {
            $stripeConfig['live_customer_id'] = null;
            $stripeConfig['live_account_id'] = null;
            $stripeConfig['live_webhook_secret'] = null;
            $stripeConfig['live_donation_product_id'] = null;
        }

        $stripeConfig = $this->attachResolvedStripeAccountIds($stripeConfig);

        PaymentMethod::setConfig('stripe', $stripeConfig);

        // Push to the database queue now (not afterResponse). afterResponse() can fail to run or
        // confuse workers on some PHP / server setups, so the job never appears for queue:work.
        Log::info('StripePaymentSettingsProvisioningJob dispatch', [
            'queue_connection' => config('queue.default'),
            'admin_user_id' => auth()->id(),
        ]);

        StripePaymentSettingsProvisioningJob::dispatch(
            auth()->id(),
            $request->stripe_mode_environment,
            [
                'old_environment' => $oldStripe?->mode_environment,
                'credentials_changed' => $credentialsChanged,
                'environment_changed' => $environmentChanged,
                'first_time_credentials' => $stripeCredentialsAddedFirstTime,
            ]
        );

        return redirect()->back()->with('success', 'Payment method settings updated successfully. Stripe webhook endpoint and signing secret are synced for Cashier when the queue job completes.');
    }

    private function stripeEnvironmentKeysChanged(PaymentMethod $old, Request $request, string $environment): bool
    {
        return match ($environment) {
            'sandbox' => $this->stripeSandboxKeysChanged($old, $request),
            'test' => $this->stripeTestKeysChanged($old, $request),
            'live' => $this->stripeLiveKeysChanged($old, $request),
            default => false,
        };
    }

    private function normStripeKey(?string $value): string
    {
        return trim((string) ($value ?? ''));
    }

    private function stripeCredentialsChanged(?PaymentMethod $old, Request $request): bool
    {
        if (! $old) {
            return false;
        }

        return $this->stripeSandboxKeysChanged($old, $request)
            || $this->stripeTestKeysChanged($old, $request)
            || $this->stripeLiveKeysChanged($old, $request);
    }

    private function stripeSandboxKeysChanged(PaymentMethod $old, Request $request): bool
    {
        return $this->normStripeKey($old->sandbox_publishable_key) !== $this->normStripeKey($request->stripe_sandbox_publishable_key)
            || $this->normStripeKey($old->sandbox_secret_key) !== $this->normStripeKey($request->stripe_sandbox_secret_key);
    }

    private function stripeTestKeysChanged(PaymentMethod $old, Request $request): bool
    {
        return $this->normStripeKey($old->test_publishable_key) !== $this->normStripeKey($request->stripe_test_publishable_key)
            || $this->normStripeKey($old->test_secret_key) !== $this->normStripeKey($request->stripe_test_secret_key);
    }

    private function stripeLiveKeysChanged(PaymentMethod $old, Request $request): bool
    {
        return $this->normStripeKey($old->live_publishable_key) !== $this->normStripeKey($request->stripe_live_publishable_key)
            || $this->normStripeKey($old->live_secret_key) !== $this->normStripeKey($request->stripe_live_secret_key);
    }

    /**
     * @param  array<string, mixed>  $stripeConfig
     * @return array<string, mixed>
     */
    private function attachResolvedStripeAccountIds(array $stripeConfig): array
    {
        foreach (['sandbox', 'test', 'live'] as $environment) {
            $secretKey = trim((string) ($stripeConfig["{$environment}_secret_key"] ?? ''));

            if ($secretKey === '') {
                continue;
            }

            $accountId = StripeConfigService::resolveAccountIdWithSecretKey($secretKey);

            if ($accountId) {
                $stripeConfig["{$environment}_account_id"] = $accountId;
            }
        }

        return $stripeConfig;
    }
}
