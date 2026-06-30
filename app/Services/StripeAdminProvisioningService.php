<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Log;
use Stripe\Exception\ApiErrorException;
use Stripe\Stripe;
use Stripe\StripeClient;
use Stripe\WebhookEndpoint;

final class StripeAdminProvisioningService
{
    /**
     * Stripe webhook events registered on the app's /stripe/webhook endpoint.
     *
     * @return list<string>
     */
    public static function requiredWebhookEvents(): array
    {
        $configured = config('cashier.webhook.events');

        if (is_array($configured) && $configured !== []) {
            return array_values(array_unique(array_map('strval', $configured)));
        }

        return [
            'payment_intent.succeeded',
            'payment_intent.payment_failed',
            'checkout.session.completed',
            'balance.available',
            'balance_transaction.created',
            'balance_transaction.updated',
            'payout.paid',
            'charge.refunded',
            'charge.dispute.created',
            'customer.subscription.created',
            'customer.subscription.updated',
            'customer.subscription.deleted',
            'invoice.payment_succeeded',
            'invoice.payment_failed',
        ];
    }

    public static function webhookEndpointUrl(): string
    {
        $base = rtrim((string) config('app.url'), '/');
        $path = trim((string) config('cashier.path', 'stripe'), '/');

        return $base.'/'.$path.'/webhook';
    }

    /**
     * Ensure Cashier webhook exists at /stripe/webhook and return signing secret.
     *
     * When $recreate is true (or no secret can be retrieved), deletes any existing endpoint
     * at this URL and creates a fresh one so Stripe returns whsec_ automatically.
     *
     * @return array{id: string|null, secret: string|null, recreated: bool}
     */
    public function ensureCashierWebhook(
        string $secretKey,
        string $environment,
        bool $recreate = false,
    ): array {
        try {
            Stripe::setApiKey($secretKey);

            $webhookUrl = self::webhookEndpointUrl();
            $requiredEvents = self::requiredWebhookEvents();

            $existingWebhook = null;
            foreach (WebhookEndpoint::all(['limit' => 100])->data as $webhook) {
                if (($webhook->url ?? '') === $webhookUrl) {
                    $existingWebhook = $webhook;
                    break;
                }
            }

            if ($existingWebhook && ! $recreate) {
                $this->syncWebhookEvents($existingWebhook, $requiredEvents, $environment);

                return [
                    'id' => (string) ($existingWebhook->id ?? ''),
                    'secret' => null,
                    'recreated' => false,
                ];
            }

            if ($existingWebhook && $recreate) {
                try {
                    WebhookEndpoint::retrieve($existingWebhook->id)->delete();
                    Log::info("Replaced existing Stripe webhook for {$environment} mode to obtain signing secret", [
                        'webhook_id' => $existingWebhook->id,
                    ]);
                } catch (\Throwable $e) {
                    Log::warning("Could not delete existing Stripe webhook for {$environment} mode", [
                        'webhook_id' => $existingWebhook->id ?? null,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            $webhook = WebhookEndpoint::create([
                'url' => $webhookUrl,
                'enabled_events' => $requiredEvents,
            ]);

            $secret = $webhook->secret ?? $webhook->signing_secret ?? null;
            if (! $secret && isset($webhook->secrets) && is_array($webhook->secrets) && count($webhook->secrets) > 0) {
                $secret = $webhook->secrets[0]->secret ?? null;
            }

            if ($secret) {
                Log::info("Created Cashier Stripe webhook for {$environment} mode", [
                    'webhook_id' => $webhook->id,
                    'url' => $webhookUrl,
                ]);
            } else {
                Log::warning("Cashier Stripe webhook created without signing secret for {$environment} mode", [
                    'webhook_id' => $webhook->id ?? null,
                ]);
            }

            return [
                'id' => (string) ($webhook->id ?? ''),
                'secret' => is_string($secret) && $secret !== '' ? $secret : null,
                'recreated' => (bool) $existingWebhook,
            ];
        } catch (ApiErrorException $e) {
            Log::error("Failed to ensure Cashier webhook for {$environment} mode", [
                'error' => $e->getMessage(),
            ]);

            return ['id' => null, 'secret' => null, 'recreated' => false];
        }
    }

    /**
     * @deprecated Use {@see ensureCashierWebhook()} instead.
     */
    public function fetchWebhookSecret(string $secretKey, string $environment): ?string
    {
        return $this->ensureCashierWebhook($secretKey, $environment, true)['secret'];
    }

    /**
     * @param  list<string>  $requiredEvents
     */
    private function syncWebhookEvents(object $webhook, array $requiredEvents, string $environment): void
    {
        $webhookId = (string) ($webhook->id ?? '');
        if ($webhookId === '') {
            return;
        }

        $currentEvents = is_array($webhook->enabled_events ?? null) ? $webhook->enabled_events : [];
        $missingEvents = array_values(array_diff($requiredEvents, $currentEvents));

        if ($missingEvents === []) {
            return;
        }

        $mergedEvents = array_values(array_unique(array_merge($currentEvents, $requiredEvents)));
        sort($mergedEvents);

        try {
            WebhookEndpoint::update($webhookId, [
                'enabled_events' => $mergedEvents,
            ]);

            Log::info("Updated Stripe webhook enabled_events for {$environment} mode", [
                'webhook_id' => $webhookId,
                'added_events' => $missingEvents,
            ]);
        } catch (\Throwable $e) {
            Log::warning("Failed to update Stripe webhook enabled_events for {$environment} mode", [
                'webhook_id' => $webhookId,
                'added_events' => $missingEvents,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Create or fetch Stripe customer for the given environment (admin account).
     */
    public function createOrFetchStripeCustomer(string $secretKey, string $environment, User $user): ?string
    {
        try {
            Stripe::setApiKey($secretKey);

            $stripe = new StripeClient(['api_key' => $secretKey]);

            $existingId = StripeCustomerLookupService::findExistingCustomerId(
                $stripe,
                (string) $user->email,
                (int) $user->id,
                'user'
            );

            if ($existingId !== null) {
                Log::info("Found existing Stripe customer for {$environment} mode", [
                    'customer_id' => $existingId,
                    'email' => $user->email,
                ]);

                return $existingId;
            }

            $customer = $stripe->customers->create([
                'email' => $user->email,
                'name' => $user->name,
                'metadata' => [
                    'user_id' => (string) $user->id,
                    'user_type' => 'user',
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
                'email' => $user->email,
            ]);

            return null;
        }
    }
}
