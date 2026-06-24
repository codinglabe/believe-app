<?php

namespace App\Http\Controllers;

use App\Models\PaymentMethod;
use App\Services\BridgeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class BridgeSettingsController extends Controller
{
    protected BridgeService $bridgeService;

    public function __construct(BridgeService $bridgeService)
    {
        // Only allow admin access
        $this->middleware('role:admin');
        $this->bridgeService = $bridgeService;
    }

    /**
     * Display the Bridge settings page.
     */
    public function index()
    {
        // Double check admin authorization
        if (auth()->user()->role !== 'admin') {
            abort(403, 'Only administrators can access Bridge settings.');
        }

        $bridge = PaymentMethod::getConfig('bridge');
        $additionalConfig = is_array($bridge?->additional_config) ? $bridge->additional_config : [];

        $defaultWebhookUrl = config('app.url') . '/webhooks/bridge';

        $settings = [
            'bridge_mode_environment' => $bridge->mode_environment ?? 'sandbox',

            // Sandbox credentials
            'bridge_sandbox_api_key' => $bridge->sandbox_api_key ?? null,
            'bridge_sandbox_webhook_url' => $bridge->sandbox_webhook_url ?? $defaultWebhookUrl,
            'bridge_sandbox_webhook_id' => $bridge->sandbox_webhook_id ?? null,
            'bridge_sandbox_webhook_public_key' => $bridge->sandbox_webhook_public_key ?? null,
            'bridge_sandbox_badge_url' => $bridge->sandbox_badge_url ?? null,

            // Live credentials
            'bridge_live_api_key' => $bridge->live_api_key ?? null,
            'bridge_live_webhook_id' => $bridge->live_webhook_id ?? null,
            'bridge_live_webhook_public_key' => $bridge->live_webhook_public_key ?? null,
            'bridge_live_badge_url' => $bridge->live_badge_url ?? null,

            // Cards + Cashier Stripe
            'bridge_sandbox_stripe_account_id' => $additionalConfig['sandbox_stripe_account_id'] ?? null,
            'bridge_live_stripe_account_id' => $additionalConfig['live_stripe_account_id'] ?? null,
            'bridge_cards_program_type' => $additionalConfig['cards_program_type'] ?? 'consumer',
            'bridge_cards_enabled_at' => $additionalConfig['cards_enabled_at'] ?? null,
            'bridge_cards_enable_stripe_account_id' => $additionalConfig['cards_enable_stripe_account_id'] ?? null,
            'bridge_resolved_stripe_account_id' => $this->bridgeService->resolveStripeAccountIdForCards(),
            'stripe_cashier_configured' => $this->bridgeService->isStripeConfiguredForCards(),
            'stripe_issuing_readiness' => $this->bridgeService->getStripeIssuingReadiness(),
            'bridge_stripe_app_install_url' => $additionalConfig['stripe_app_install_url']
                ?? 'https://marketplace.stripe.com/apps/install/link/com.stripe.bridge.cards?redirect_uri=https://dashboard.bridge.xyz/app/cards',

            'app_url' => config('app.url'),
        ];

        return Inertia::render('settings/bridge', [
            'settings' => $settings,
        ]);
    }

    /**
     * Update the Bridge settings.
     */
    public function update(Request $request)
    {
        // Double check admin authorization
        if (auth()->user()->role !== 'admin') {
            abort(403, 'Only administrators can update Bridge settings.');
        }

        $request->validate([
            'bridge_mode_environment' => ['required', 'string', 'in:sandbox,live'],

            // Sandbox credentials
            'bridge_sandbox_api_key' => ['nullable', 'string', 'max:255'],
            'bridge_sandbox_webhook_url' => ['nullable', 'url', 'max:500'],
            'bridge_sandbox_badge_url' => ['nullable', 'url', 'max:500'],

            // Live credentials
            'bridge_live_api_key' => ['nullable', 'string', 'max:255'],
            'bridge_live_badge_url' => ['nullable', 'url', 'max:500'],

            // Cards + Cashier Stripe
            'bridge_sandbox_stripe_account_id' => ['nullable', 'string', 'max:255'],
            'bridge_live_stripe_account_id' => ['nullable', 'string', 'max:255'],
            'bridge_cards_program_type' => ['nullable', 'string', 'in:consumer,commercial'],
            'bridge_stripe_app_install_url' => ['nullable', 'url', 'max:500'],
        ]);

        $existingBridge = PaymentMethod::getConfig('bridge');
        $additionalConfig = is_array($existingBridge?->additional_config) ? $existingBridge->additional_config : [];

        $additionalConfig['sandbox_stripe_account_id'] = $request->bridge_sandbox_stripe_account_id ?: null;
        $additionalConfig['live_stripe_account_id'] = $request->bridge_live_stripe_account_id ?: null;
        $additionalConfig['cards_program_type'] = $request->bridge_cards_program_type ?: 'consumer';
        $additionalConfig['stripe_app_install_url'] = $request->bridge_stripe_app_install_url ?: null;

        // Prepare Bridge config
        $bridgeConfig = [
            'mode_environment' => $request->bridge_mode_environment,
            'sandbox_api_key' => $request->bridge_sandbox_api_key,
            'live_api_key' => $request->bridge_live_api_key,
            'sandbox_badge_url' => $request->bridge_sandbox_badge_url,
            'live_badge_url' => $request->bridge_live_badge_url,
            'additional_config' => $additionalConfig,
        ];

        // Get webhook URL for sandbox (use custom URL if provided, otherwise default)
        $sandboxWebhookUrl = $request->bridge_sandbox_webhook_url
            ?: (config('app.url') . '/webhooks/bridge');

        // Store sandbox webhook URL
        $bridgeConfig['sandbox_webhook_url'] = $sandboxWebhookUrl;

        // Get webhook URL for live (always use default)
        $liveWebhookUrl = config('app.url') . '/webhooks/bridge';

        // Create/activate webhooks for sandbox if API key is provided
        if (! empty($request->bridge_sandbox_api_key)) {
            try {
                // Create new BridgeService instance with sandbox credentials directly
                $sandboxService = new BridgeService($request->bridge_sandbox_api_key, 'sandbox');

                // Find or create and activate webhook with custom URL
                $webhookResult = $sandboxService->findOrCreateWebhook($sandboxWebhookUrl);

                if ($webhookResult['success'] && isset($webhookResult['data'])) {
                    $webhookData = $webhookResult['data'];
                    $bridgeConfig['sandbox_webhook_id'] = $webhookData['id'] ?? null;
                    $bridgeConfig['sandbox_webhook_public_key'] = $webhookData['public_key'] ?? null;

                    Log::info('Bridge sandbox webhook created/activated', [
                        'webhook_id' => $bridgeConfig['sandbox_webhook_id'],
                        'url' => $sandboxWebhookUrl,
                    ]);
                } else {
                    Log::warning('Failed to create/activate Bridge sandbox webhook', [
                        'error' => $webhookResult['error'] ?? 'Unknown error',
                    ]);
                }
            } catch (\Exception $e) {
                Log::error('Failed to create/activate Bridge sandbox webhook', [
                    'error' => $e->getMessage(),
                ]);
            }
        }

        // Create/activate webhooks for live if API key is provided
        if (! empty($request->bridge_live_api_key)) {
            try {
                // Create new BridgeService instance with live credentials directly
                $liveService = new BridgeService($request->bridge_live_api_key, 'live');

                // Find or create and activate webhook (live always uses default URL)
                $webhookResult = $liveService->findOrCreateWebhook($liveWebhookUrl);

                if ($webhookResult['success'] && isset($webhookResult['data'])) {
                    $webhookData = $webhookResult['data'];
                    $bridgeConfig['live_webhook_id'] = $webhookData['id'] ?? null;
                    $bridgeConfig['live_webhook_public_key'] = $webhookData['public_key'] ?? null;

                    Log::info('Bridge live webhook created/activated', [
                        'webhook_id' => $bridgeConfig['live_webhook_id'],
                        'url' => $liveWebhookUrl,
                    ]);
                } else {
                    Log::warning('Failed to create/activate Bridge live webhook', [
                        'error' => $webhookResult['error'] ?? 'Unknown error',
                    ]);
                }
            } catch (\Exception $e) {
                Log::error('Failed to create/activate Bridge live webhook', [
                    'error' => $e->getMessage(),
                ]);
            }
        }

        // Save configuration
        PaymentMethod::setConfig('bridge', $bridgeConfig);

        return redirect()->back()->with('success', 'Bridge settings updated successfully.');
    }

    /**
     * Link Bridge cards to Cashier Stripe.
     *
     * Sandbox: POST /cards/enable
     * Production: verify live Stripe Issuing (Bridge Cards app — no /cards/enable API)
     *
     * @see https://apidocs.bridge.xyz/platform/cards/sandbox/sandbox
     * @see https://apidocs.bridge.xyz/platform/cards/overview/stripe-issuing
     */
    public function enableCards(Request $request)
    {
        if (auth()->user()->role !== 'admin') {
            abort(403, 'Only administrators can enable Bridge cards.');
        }

        $request->validate([
            'bridge_cards_program_type' => ['nullable', 'string', 'in:consumer,commercial'],
        ]);

        $programType = $request->input('bridge_cards_program_type') ?: $this->bridgeService->getCardsProgramType();

        if ($this->bridgeService->isSandbox()) {
            $result = $this->bridgeService->enableCardsProduct($programType, true);

            if ($result['success'] ?? false) {
                return redirect()->back()->with('success', 'Bridge cards product linked to your Cashier Stripe account successfully.');
            }

            return redirect()->back()->with('error', $result['error'] ?? 'Failed to enable Bridge cards product.');
        }

        $result = $this->bridgeService->ensureCardsProductEnabled();

        if ($result['success'] ?? false) {
            return redirect()->back()->with(
                'success',
                'Live Stripe Issuing is active. Bridge cards are ready — customers need an approved cards endorsement before issuance.'
            );
        }

        return redirect()->back()->with(
            'error',
            $result['error'] ?? 'Live Stripe Issuing is not active. Complete Bridge cards onboarding and install the Bridge Cards Stripe App on your live Stripe account.'
        );
    }
}
