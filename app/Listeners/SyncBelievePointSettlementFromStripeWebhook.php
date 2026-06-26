<?php

namespace App\Listeners;

use App\Services\StripeBelievePointSettlementWebhookService;
use Laravel\Cashier\Events\WebhookReceived;

class SyncBelievePointSettlementFromStripeWebhook
{
    public function handle(WebhookReceived $event): void
    {
        $type = (string) ($event->payload['type'] ?? '');
        $object = $event->payload['data']['object'] ?? [];

        if (! is_array($object)) {
            return;
        }

        match ($type) {
            'balance.available' => StripeBelievePointSettlementWebhookService::handleBalanceAvailable(),
            'balance_transaction.created', 'balance_transaction.updated' => StripeBelievePointSettlementWebhookService::handleBalanceTransaction($object),
            'payout.paid' => StripeBelievePointSettlementWebhookService::handlePayoutPaid($object),
            'charge.refunded' => StripeBelievePointSettlementWebhookService::handleChargeRefunded($object),
            'charge.dispute.created' => StripeBelievePointSettlementWebhookService::handleChargeDisputeCreated($object),
            default => null,
        };
    }
}
