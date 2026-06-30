<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Route;
use Laravel\Cashier\Cashier;
use Stripe\Exception\ApiErrorException;
use Stripe\StripeClient;
use Throwable;

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

        $events = is_array($configured) && $configured !== []
            ? array_values(array_unique(array_map('strval', $configured)))
            : [
                'payment_intent.succeeded',
                'payment_intent.payment_failed',
                'checkout.session.completed',
                'balance.available',
                'payout.paid',
                'charge.refunded',
                'charge.dispute.created',
                'customer.subscription.created',
                'customer.subscription.updated',
                'customer.subscription.deleted',
                'invoice.payment_succeeded',
                'invoice.payment_failed',
            ];

        // Stripe does not expose balance_transaction.* webhook event types.
        return array_values(array_filter(
            $events,
            static fn (string $event): bool => ! str_starts_with($event, 'balance_transaction.')
        ));
    }

    public static function webhookEndpointUrl(): string
    {
        try {
            if (Route::has('cashier.webhook')) {
                return rtrim(route('cashier.webhook'), '/');
            }
        } catch (Throwable) {
            // Fall back to APP_URL below.
        }

        $base = rtrim((string) config('app.url'), '/');
        $path = trim((string) config('cashier.path', 'stripe'), '/');

        return $base.'/'.$path.'/webhook';
    }

    /**
     * @return array{id: string|null, secret: string|null, recreated: bool, created: bool, error: string|null, url: string}
     */
    public function ensureCashierWebhook(
        string $secretKey,
        string $environment,
        bool $recreate = false,
    ): array {
        $webhookUrl = self::webhookEndpointUrl();
        $empty = [
            'id' => null,
            'secret' => null,
            'recreated' => false,
            'created' => false,
            'error' => null,
            'url' => $webhookUrl,
        ];

        try {
            $stripe = new StripeClient(['api_key' => $secretKey]);
            $requiredEvents = self::requiredWebhookEvents();

            $existingWebhook = $this->findWebhookAtUrl($stripe, $webhookUrl);

            if ($existingWebhook && ! $recreate) {
                $this->syncWebhookEvents($stripe, $existingWebhook, $requiredEvents, $environment);

                return [
                    'id' => (string) ($existingWebhook->id ?? ''),
                    'secret' => null,
                    'recreated' => false,
                    'created' => false,
                    'error' => null,
                    'url' => $webhookUrl,
                ];
            }

            if ($existingWebhook && $recreate) {
                try {
                    $stripe->webhookEndpoints->delete($existingWebhook->id);
                    Log::info("Replaced existing Stripe webhook for {$environment} mode", [
                        'webhook_id' => $existingWebhook->id,
                        'url' => $webhookUrl,
                    ]);
                } catch (Throwable $e) {
                    Log::warning("Could not delete existing Stripe webhook for {$environment} mode", [
                        'webhook_id' => $existingWebhook->id ?? null,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            $webhook = $stripe->webhookEndpoints->create(array_filter([
                'url' => $webhookUrl,
                'enabled_events' => $requiredEvents,
                'api_version' => Cashier::STRIPE_VERSION,
            ]));

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
                    'url' => $webhookUrl,
                ]);
            }

            return [
                'id' => (string) ($webhook->id ?? ''),
                'secret' => is_string($secret) && $secret !== '' ? $secret : null,
                'recreated' => (bool) $existingWebhook,
                'created' => true,
                'error' => is_string($secret) && $secret !== '' ? null : 'Stripe created the webhook but did not return a signing secret.',
                'url' => $webhookUrl,
            ];
        } catch (ApiErrorException $e) {
            $message = $e->getMessage();
            Log::error("Failed to ensure Cashier webhook for {$environment} mode", [
                'url' => $webhookUrl,
                'error' => $message,
                'stripe_code' => $e->getStripeCode(),
            ]);

            return array_merge($empty, ['error' => $message]);
        } catch (Throwable $e) {
            Log::error("Unexpected error ensuring Cashier webhook for {$environment} mode", [
                'url' => $webhookUrl,
                'error' => $e->getMessage(),
            ]);

            return array_merge($empty, ['error' => $e->getMessage()]);
        }
    }

    /**
     * @deprecated Use {@see ensureCashierWebhook()} instead.
     */
    public function fetchWebhookSecret(string $secretKey, string $environment): ?string
    {
        return $this->ensureCashierWebhook($secretKey, $environment, true)['secret'];
    }

    private function findWebhookAtUrl(StripeClient $stripe, string $webhookUrl): ?object
    {
        $target = $this->normalizeWebhookUrl($webhookUrl);

        foreach ($stripe->webhookEndpoints->all(['limit' => 100])->data as $webhook) {
            if ($this->normalizeWebhookUrl((string) ($webhook->url ?? '')) === $target) {
                return $webhook;
            }
        }

        return null;
    }

    private function normalizeWebhookUrl(string $url): string
    {
        $url = trim($url);

        return rtrim($url, '/');
    }

    /**
     * @param  list<string>  $requiredEvents
     */
    private function syncWebhookEvents(StripeClient $stripe, object $webhook, array $requiredEvents, string $environment): void
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
            $stripe->webhookEndpoints->update($webhookId, [
                'enabled_events' => $mergedEvents,
            ]);

            Log::info("Updated Stripe webhook enabled_events for {$environment} mode", [
                'webhook_id' => $webhookId,
                'added_events' => $missingEvents,
            ]);
        } catch (Throwable $e) {
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
