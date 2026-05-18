<?php

namespace App\Listeners;

use App\Models\Subscription;
use App\Models\User;
use App\Support\PlanAiMediaStudioSubscriptionCredits;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Laravel\Cashier\Events\WebhookReceived;

/**
 * Adds AI Media Studio credits on each recurring billing cycle (not the first checkout invoice, which is handled in {@see \App\Http\Controllers\PlansController::success}).
 */
class GrantAiMediaStudioCreditsOnPlanSubscriptionRenewal
{
    public function handle(WebhookReceived $event): void
    {
        if (($event->payload['type'] ?? '') !== 'invoice.payment_succeeded') {
            return;
        }

        $invoice = $event->payload['data']['object'] ?? [];
        if (! is_array($invoice)) {
            return;
        }

        if (($invoice['billing_reason'] ?? '') !== 'subscription_cycle') {
            return;
        }

        $rawSub = $invoice['subscription'] ?? null;
        $subscriptionStripeId = is_string($rawSub) ? $rawSub : (is_array($rawSub) ? (string) ($rawSub['id'] ?? '') : '');
        if ($subscriptionStripeId === '') {
            return;
        }

        $customerId = $invoice['customer'] ?? null;
        if (! is_string($customerId) || $customerId === '') {
            return;
        }

        $subRow = Subscription::query()
            ->where('stripe_id', $subscriptionStripeId)
            ->where('type', 'default')
            ->first();
        if (! $subRow) {
            return;
        }

        $owner = $subRow->owner;
        if (! $owner instanceof User) {
            return;
        }

        if ($owner->stripe_id !== $customerId) {
            return;
        }

        $invoiceId = (string) ($invoice['id'] ?? '');
        if ($invoiceId === '') {
            return;
        }

        $credits = PlanAiMediaStudioSubscriptionCredits::renewalGrantAmount();
        if ($credits < 0.01) {
            return;
        }

        $inserted = 0;
        DB::transaction(function () use ($invoiceId, $owner, $credits, &$inserted) {
            $inserted = (int) DB::table('ai_media_studio_subscription_invoice_grants')->insertOrIgnore([
                'stripe_invoice_id' => $invoiceId,
                'user_id' => $owner->id,
                'credits_granted' => $credits,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            if ($inserted > 0) {
                $owner->increment('ai_media_studio_credits', $credits);
            }
        });

        if ($inserted > 0) {
            Log::info('ai_media_studio.subscription_renewal_credits_granted', [
                'user_id' => $owner->id,
                'stripe_invoice_id' => $invoiceId,
                'credits' => $credits,
            ]);
        }
    }
}
