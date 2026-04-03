<?php

namespace App\Listeners;

use App\Services\BelievePointPurchaseSettlementService;
use Laravel\Cashier\Events\WebhookReceived;

class CompleteBelievePointPurchaseFromStripeWebhook
{
    public function handle(WebhookReceived $event): void
    {
        $type = $event->payload['type'] ?? '';

        if ($type === 'payment_intent.succeeded') {
            $pi = $event->payload['data']['object'] ?? [];
            $meta = $pi['metadata'] ?? [];
            if (($meta['type'] ?? '') !== 'believe_points_purchase' || empty($meta['purchase_id'])) {
                return;
            }
            BelievePointPurchaseSettlementService::settleCheckoutPurchase(
                (int) $meta['purchase_id'],
                (string) $pi['id']
            );

            return;
        }

        if ($type === 'checkout.session.completed') {
            $session = $event->payload['data']['object'] ?? [];
            $meta = $session['metadata'] ?? [];
            if (($meta['type'] ?? '') !== 'believe_points_purchase' || empty($meta['purchase_id'])) {
                return;
            }
            if (($session['payment_status'] ?? '') !== 'paid') {
                return;
            }
            $piId = $session['payment_intent'] ?? null;
            if (! $piId) {
                return;
            }
            BelievePointPurchaseSettlementService::settleCheckoutPurchase(
                (int) $meta['purchase_id'],
                (string) $piId
            );
        }
    }
}
