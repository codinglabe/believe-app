<?php

namespace App\Http\Middleware;

use App\Services\StripeConfigService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;
use Stripe\Exception\SignatureVerificationException;
use Stripe\WebhookSignature;
use Symfony\Component\HttpFoundation\Response;

/**
 * Loads Stripe keys from admin payment settings. For /stripe/webhook, picks the signing
 * secret that matches the request (live, test, or sandbox) so Cashier verification succeeds.
 */
final class ConfigureCashierStripeFromDatabase
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->is('stripe/webhook')) {
            $this->configureForCashierWebhook($request);
        } elseif ($request->is('stripe/*')) {
            StripeConfigService::configureStripe();
        }

        return $next($request);
    }

    private function configureForCashierWebhook(Request $request): void
    {
        $signature = (string) $request->header('Stripe-Signature', '');
        $payload = $request->getContent();
        $tolerance = (int) config('cashier.webhook.tolerance', 300);

        foreach (['live', 'test', 'sandbox'] as $environment) {
            $credentials = StripeConfigService::getCredentials($environment);
            $secret = trim((string) ($credentials['webhook_secret'] ?? ''));

            if ($secret === '') {
                continue;
            }

            if ($signature !== '') {
                try {
                    WebhookSignature::verifyHeader($payload, $signature, $secret, $tolerance);
                } catch (SignatureVerificationException) {
                    continue;
                }
            }

            StripeConfigService::configureStripe($environment);
            Config::set('cashier.webhook.secret', $secret);

            if ($signature !== '') {
                Log::info('Stripe Cashier webhook signature matched', [
                    'environment' => $environment,
                    'event_preview' => $this->eventTypePreview($payload),
                ]);
            }

            return;
        }

        StripeConfigService::configureStripe();

        if ($signature === '') {
            Log::warning('Stripe webhook missing Stripe-Signature header', [
                'url' => $request->fullUrl(),
            ]);
        } else {
            Log::warning('Stripe webhook signature did not match any configured signing secret', [
                'url' => $request->fullUrl(),
                'active_mode' => StripeConfigService::getEnvironment(),
            ]);
        }
    }

    private function eventTypePreview(string $payload): ?string
    {
        $decoded = json_decode($payload, true);

        return is_array($decoded) ? ($decoded['type'] ?? null) : null;
    }
}
