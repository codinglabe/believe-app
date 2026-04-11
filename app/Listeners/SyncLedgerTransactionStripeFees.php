<?php

namespace App\Listeners;

use App\Services\StripeLedgerTransactionWebhookSync;
use Laravel\Cashier\Events\WebhookReceived;

/**
 * Global: when metadata points at {@see \App\Models\Transaction} id, persist actual Stripe fees
 * from the PaymentIntent (Cashier webhook — synchronous, no queue).
 */
class SyncLedgerTransactionStripeFees
{
    public function handle(WebhookReceived $event): void
    {
        StripeLedgerTransactionWebhookSync::syncFromWebhookPayload($event->payload);
    }
}
