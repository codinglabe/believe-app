<?php

namespace App\Listeners;

use App\Models\Donation;
use App\Services\DonationStripePaymentCompletion;
use Illuminate\Support\Facades\Log;
use Laravel\Cashier\Cashier;
use Laravel\Cashier\Events\WebhookReceived;

/**
 * Completes pending main /donate Checkout sessions from Stripe webhooks (Connect + platform).
 */
class SyncMainDonationFromStripeWebhook
{
    public function handle(WebhookReceived $event): void
    {
        $payload = $event->payload ?? [];
        $type = $payload['type'] ?? '';

        $accountId = $payload['account'] ?? null;
        $accountOpts = is_string($accountId) && $accountId !== '' ? ['stripe_account' => $accountId] : [];

        if ($type === 'checkout.session.completed') {
            $session = $payload['data']['object'] ?? [];
            if (($session['payment_status'] ?? '') !== 'paid') {
                return;
            }
            if (($session['mode'] ?? '') !== 'payment') {
                return;
            }

            $meta = $session['metadata'] ?? [];
            $donationId = $meta['donation_id'] ?? null;
            if ($donationId === null || $donationId === '') {
                return;
            }

            $donation = Donation::query()->find((int) $donationId);
            if (! $donation || $donation->payment_method === 'believe_points') {
                return;
            }

            $piRef = $session['payment_intent'] ?? null;
            if (! $piRef) {
                return;
            }
            $piId = is_string($piRef) ? $piRef : ($piRef['id'] ?? null);
            if (! is_string($piId) || $piId === '') {
                return;
            }

            $this->finalizeOneTimeGift($donation, $piId, $accountOpts);

            return;
        }

        if ($type === 'payment_intent.succeeded') {
            $pi = $payload['data']['object'] ?? [];
            $piId = $pi['id'] ?? null;
            $meta = $pi['metadata'] ?? [];
            $donationId = $meta['donation_id'] ?? null;
            if (! is_string($piId) || $piId === '' || $donationId === null || $donationId === '') {
                return;
            }

            $donation = Donation::query()->find((int) $donationId);
            if (! $donation || $donation->payment_method === 'believe_points') {
                return;
            }

            $this->finalizeOneTimeGift($donation, $piId, $accountOpts);

            return;
        }

        if ($type === 'payment_intent.payment_failed') {
            $pi = $payload['data']['object'] ?? [];
            $meta = $pi['metadata'] ?? [];
            $donationId = $meta['donation_id'] ?? null;
            if ($donationId === null || $donationId === '') {
                return;
            }

            $donation = Donation::query()->find((int) $donationId);
            if (! $donation || $donation->status !== 'pending') {
                return;
            }

            $donation->update(['status' => 'failed']);
        }
    }

    /**
     * @param  array<string, string>  $accountOpts
     */
    private function finalizeOneTimeGift(Donation $donation, string $paymentIntentId, array $accountOpts): void
    {
        if ($donation->frequency !== 'one-time') {
            return;
        }

        try {
            DonationStripePaymentCompletion::completeSuccessfulOneTime(
                $donation,
                $paymentIntentId,
                $this->paymentMethodTypeFromIntent($paymentIntentId, $accountOpts)
            );
        } catch (\Throwable $e) {
            Log::warning('Stripe webhook donation settlement skipped', [
                'donation_id' => $donation->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * @param  array<string, string>  $accountOpts
     */
    private function paymentMethodTypeFromIntent(string $paymentIntentId, array $accountOpts): string
    {
        try {
            $pi = Cashier::stripe()->paymentIntents->retrieve(
                $paymentIntentId,
                ['expand' => ['payment_method']],
                $accountOpts
            );
            if ($pi->payment_method && is_object($pi->payment_method) && isset($pi->payment_method->type)) {
                return (string) $pi->payment_method->type;
            }
        } catch (\Throwable) {
        }

        return 'card';
    }
}
