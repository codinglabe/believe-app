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
     * Fetch or create webhook endpoint and get its signing secret.
     */
    public function fetchWebhookSecret(string $secretKey, string $environment): ?string
    {
        try {
            Stripe::setApiKey($secretKey);

            $webhookUrl = StripeAdminProvisioningService::webhookEndpointUrl();
            $requiredEvents = self::requiredWebhookEvents();

            $webhooks = WebhookEndpoint::all(['limit' => 100]);

            $existingWebhook = null;
            foreach ($webhooks->data as $webhook) {
                if ($webhook->url === $webhookUrl) {
                    $existingWebhook = $webhook;
                    break;
                }
            }

            if ($existingWebhook) {
                $this->syncWebhookEvents($existingWebhook, $requiredEvents, $environment);

                Log::info("Webhook endpoint already exists for {$environment} mode", [
                    'webhook_id' => $existingWebhook->id,
                    'url' => $existingWebhook->url,
                ]);
                Log::info('Webhook exists but signing secret cannot be retrieved via API. Please get it from Stripe Dashboard.');

                return null;
            }

            try {
                $webhook = WebhookEndpoint::create([
                    'url' => $webhookUrl,
                    'enabled_events' => $requiredEvents,
                ]);

                $webhookSecret = $webhook->secret ?? $webhook->signing_secret ?? null;

                if ($webhookSecret) {
                    Log::info("Created new webhook endpoint and got signing secret for {$environment} mode", [
                        'webhook_id' => $webhook->id,
                    ]);

                    return $webhookSecret;
                }

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
