<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Log;
use Stripe\Exception\ApiErrorException;
use Stripe\Stripe;
use Stripe\StripeClient;
use Stripe\WebhookEndpoint;

class StripeAdminProvisioningService
{
    /**
     * Fetch or create webhook endpoint and get its signing secret.
     */
    public function fetchWebhookSecret(string $secretKey, string $environment): ?string
    {
        try {
            Stripe::setApiKey($secretKey);

            $webhookUrl = config('app.url').'/stripe/webhook';

            $webhooks = WebhookEndpoint::all(['limit' => 100]);

            $existingWebhook = null;
            foreach ($webhooks->data as $webhook) {
                if ($webhook->url === $webhookUrl) {
                    $existingWebhook = $webhook;
                    break;
                }
            }

            if ($existingWebhook) {
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
