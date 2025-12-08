<?php

namespace App\Http\Controllers;

use App\Models\PaymentMethod;
use App\Services\StripeConfigService;
use App\Services\StripeEnvironmentSyncService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Stripe\Stripe;
use Stripe\Customer;
use Stripe\WebhookEndpoint;
use Stripe\Exception\ApiErrorException;

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
            
            // Separate test credentials
            'stripe_test_publishable_key' => $stripe->test_publishable_key ?? null,
            'stripe_test_secret_key' => $stripe->test_secret_key ?? null,
            'stripe_test_customer_id' => $stripe->test_customer_id ?? null,
            
            // Separate live credentials
            'stripe_live_publishable_key' => $stripe->live_publishable_key ?? null,
            'stripe_live_secret_key' => $stripe->live_secret_key ?? null,
            'stripe_live_customer_id' => $stripe->live_customer_id ?? null,
        ];

        return Inertia::render('settings/payment-methods', [
            'settings' => $settings,
        ]);
    }

    /**
     * Fetch or create webhook endpoint and get its signing secret
     */
    private function fetchWebhookSecret(string $secretKey, string $environment): ?string
    {
        try {
            Stripe::setApiKey($secretKey);
            
            // Get the webhook URL for this application
            $webhookUrl = config('app.url') . '/stripe/webhook';
            
            // List all webhook endpoints
            $webhooks = WebhookEndpoint::all(['limit' => 100]);
            
            // Find webhook that matches our URL
            $existingWebhook = null;
            foreach ($webhooks->data as $webhook) {
                if ($webhook->url === $webhookUrl) {
                    $existingWebhook = $webhook;
                    break;
                }
            }
            
            // If webhook exists, we can't retrieve the signing secret via API
            // Stripe doesn't expose it for security reasons
            // We'll try to create a new one or use the existing endpoint ID
            if ($existingWebhook) {
                Log::info("Webhook endpoint already exists for {$environment} mode", [
                    'webhook_id' => $existingWebhook->id,
                    'url' => $existingWebhook->url,
                ]);
                
                // Note: We can't retrieve the signing secret from existing webhooks
                // The user needs to get it from Stripe Dashboard or we need to create a new endpoint
                // For now, we'll return null and let the user know they need to enter it manually
                // OR we can create a new endpoint to get a fresh secret
                
                // Note: We can't retrieve the signing secret from existing webhooks via API
                // The user needs to get it from Stripe Dashboard
                // For now, we'll return null - the user can manually enter it or we can create a new endpoint
                Log::info("Webhook exists but signing secret cannot be retrieved via API. Please get it from Stripe Dashboard.");
                return null;
            }
            
            // If no webhook found, create a new one
            try {
                $webhook = WebhookEndpoint::create([
                    'url' => $webhookUrl,
                    'enabled_events' => [
                        'payment_intent.succeeded',
                        'payment_intent.payment_failed',
                        'customer.subscription.created',
                        'customer.subscription.updated',
                        'customer.subscription.deleted',
                        'invoice.payment_succeeded',
                        'invoice.payment_failed',
                    ],
                ]);
                
                // The signing secret is returned directly when creating a new webhook
                // It's in the 'secret' field (for older API) or 'signing_secret' field
                $webhookSecret = $webhook->secret ?? $webhook->signing_secret ?? null;
                
                if ($webhookSecret) {
                    Log::info("Created new webhook endpoint and got signing secret for {$environment} mode", [
                        'webhook_id' => $webhook->id,
                    ]);
                    return $webhookSecret;
                }
                
                // Try alternative: check if secrets array exists
                if (isset($webhook->secrets) && is_array($webhook->secrets) && count($webhook->secrets) > 0) {
                    $webhookSecret = $webhook->secrets[0]->secret ?? null;
                    if ($webhookSecret) {
                        Log::info("Got signing secret from secrets array for {$environment} mode", [
                            'webhook_id' => $webhook->id,
                        ]);
                        return $webhookSecret;
                    }
                }
                
                Log::warning("Webhook created but no signing secret found for {$environment} mode");
                return null;
            } catch (\Exception $e) {
                Log::error("Failed to create webhook endpoint for {$environment} mode", [
                    'error' => $e->getMessage(),
                ]);
                return null;
            }
        } catch (ApiErrorException $e) {
            Log::error("Failed to fetch/create webhook secret for {$environment} mode", [
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * Create or fetch Stripe customer for the given environment
     */
    private function createOrFetchStripeCustomer(string $secretKey, string $environment): ?string
    {
        try {
            Stripe::setApiKey($secretKey);
            
            $user = auth()->user();
            if (!$user) {
                return null;
            }

            // Try to find existing customer by email
            $customers = Customer::all([
                'email' => $user->email,
                'limit' => 1,
            ]);

            if (count($customers->data) > 0) {
                // Customer exists, return the ID
                $customerId = $customers->data[0]->id;
                Log::info("Found existing Stripe customer for {$environment} mode", [
                    'customer_id' => $customerId,
                    'email' => $user->email,
                ]);
                return $customerId;
            }

            // Create new customer
            $customer = Customer::create([
                'email' => $user->email,
                'name' => $user->name,
                'metadata' => [
                    'user_id' => $user->id,
                    'environment' => $environment,
                ],
            ]);

            Log::info("Created new Stripe customer for {$environment} mode", [
                'customer_id' => $customer->id,
                'email' => $user->email,
            ]);

            return $customer->id;
        } catch (ApiErrorException $e) {
            Log::error("Failed to create/fetch Stripe customer for {$environment} mode", [
                'error' => $e->getMessage(),
                'email' => auth()->user()?->email,
            ]);
            return null;
        }
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

            'stripe_mode_environment' => ['required', 'string', 'in:sandbox,live'],
            
            // Test credentials
            'stripe_test_publishable_key' => ['nullable', 'string', 'max:255'],
            'stripe_test_secret_key' => ['nullable', 'string', 'max:255'],
            
            // Live credentials
            'stripe_live_publishable_key' => ['nullable', 'string', 'max:255'],
            'stripe_live_secret_key' => ['nullable', 'string', 'max:255'],
        ]);

        PaymentMethod::setConfig('paypal', [
            'client_id' => $request->paypal_client_id,
            'client_secret' => $request->paypal_client_secret,
            'mode_environment' => $request->paypal_mode_environment,
        ]);

        // Check if Stripe environment has changed (before updating config)
        $oldStripe = PaymentMethod::getConfig('stripe');
        $oldEnvironment = $oldStripe ? $oldStripe->mode_environment : null;
        $environmentChanged = $oldEnvironment && ($oldEnvironment !== $request->stripe_mode_environment);

        // Prepare Stripe config
        $stripeConfig = [
            'mode_environment' => $request->stripe_mode_environment,
            'test_publishable_key' => $request->stripe_test_publishable_key,
            'test_secret_key' => $request->stripe_test_secret_key,
            'live_publishable_key' => $request->stripe_live_publishable_key,
            'live_secret_key' => $request->stripe_live_secret_key,
        ];

        // Create or fetch Stripe customers and webhook secrets if secret keys are provided
        if (!empty($request->stripe_test_secret_key)) {
            $testCustomerId = $this->createOrFetchStripeCustomer($request->stripe_test_secret_key, 'test');
            if ($testCustomerId) {
                $stripeConfig['test_customer_id'] = $testCustomerId;
            }
            
            // Automatically fetch webhook secret
            $testWebhookSecret = $this->fetchWebhookSecret($request->stripe_test_secret_key, 'test');
            if ($testWebhookSecret) {
                $stripeConfig['test_webhook_secret'] = $testWebhookSecret;
            }
        }

        if (!empty($request->stripe_live_secret_key)) {
            $liveCustomerId = $this->createOrFetchStripeCustomer($request->stripe_live_secret_key, 'live');
            if ($liveCustomerId) {
                $stripeConfig['live_customer_id'] = $liveCustomerId;
            }
            
            // Automatically fetch webhook secret
            $liveWebhookSecret = $this->fetchWebhookSecret($request->stripe_live_secret_key, 'live');
            if ($liveWebhookSecret) {
                $stripeConfig['live_webhook_secret'] = $liveWebhookSecret;
            }
        }

        PaymentMethod::setConfig('stripe', $stripeConfig);

        // Reconfigure Stripe/Cashier with new credentials immediately
        try {
            $environment = $request->stripe_mode_environment;
            $credentials = StripeConfigService::getCredentials($environment);

            if ($credentials && !empty($credentials['secret_key']) && !empty($credentials['publishable_key'])) {
                // Update config cache
                Config::set('cashier.secret', $credentials['secret_key']);
                Config::set('cashier.key', $credentials['publishable_key']);
                
                // Update webhook secret if available
                if (!empty($credentials['webhook_secret'])) {
                    Config::set('cashier.webhook.secret', $credentials['webhook_secret']);
                }

                // Set Stripe API key globally
                Stripe::setApiKey($credentials['secret_key']);

                // If environment changed, sync all Stripe IDs (users, livestock_users, plans)
                if ($environmentChanged && !empty($credentials['secret_key'])) {
                    try {
                        Log::info("Stripe environment changed, syncing all Stripe IDs", [
                            'old_environment' => $oldStripe->mode_environment,
                            'new_environment' => $environment,
                        ]);
                        
                        // Run sync in background to avoid timeout
                        // For now, we'll run it synchronously but with error handling
                        $syncResults = StripeEnvironmentSyncService::syncAll($environment);
                        
                        Log::info("Stripe environment sync completed", [
                            'environment' => $environment,
                            'results' => $syncResults,
                        ]);
                    } catch (\Exception $e) {
                        Log::error('Failed to sync Stripe IDs after environment change', [
                            'environment' => $environment,
                            'error' => $e->getMessage(),
                        ]);
                        // Don't fail the request, just log the error
                    }
                }
            }
        } catch (\Exception $e) {
            Log::error('Failed to reconfigure Stripe after settings update', [
                'error' => $e->getMessage(),
            ]);
        }

        return redirect()->back()->with('success', 'Payment method settings updated successfully.');
    }
}
