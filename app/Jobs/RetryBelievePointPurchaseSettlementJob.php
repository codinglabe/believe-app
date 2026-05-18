<?php

namespace App\Jobs;

use App\Models\BelievePointPurchase;
use App\Services\BelievePointPurchaseSettlementService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Laravel\Cashier\Cashier;

/**
 * Polls Stripe until a Believe Points checkout PaymentIntent succeeds or fails — no webhook required.
 * With QUEUE_CONNECTION=database (or redis, etc.), a worker must be running: php artisan queue:work
 */
class RetryBelievePointPurchaseSettlementJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 120;

    public function __construct(
        public int $purchaseId,
        public string $paymentIntentId,
    ) {}

    public function retryUntil(): \DateTimeInterface
    {
        return now()->addDays(10);
    }

    public function handle(): void
    {
        $purchase = BelievePointPurchase::find($this->purchaseId);
        if (! $purchase) {
            return;
        }

        if ($purchase->status !== 'pending') {
            return;
        }

        try {
            $pi = Cashier::stripe()->paymentIntents->retrieve($this->paymentIntentId);
        } catch (\Throwable $e) {
            Log::warning('Believe Points settlement job: could not retrieve PaymentIntent', [
                'purchase_id' => $this->purchaseId,
                'payment_intent_id' => $this->paymentIntentId,
                'message' => $e->getMessage(),
            ]);
            $this->release(120);

            return;
        }

        $status = (string) ($pi->status ?? '');

        if ($status === 'succeeded') {
            BelievePointPurchaseSettlementService::settleCheckoutPurchase($purchase->id, $this->paymentIntentId);

            return;
        }

        if (in_array($status, ['canceled', 'failed'], true)) {
            if ($purchase->status === 'pending') {
                $purchase->update([
                    'status' => 'failed',
                    'failure_code' => $status,
                    'failure_message' => 'Payment was canceled or failed before completion.',
                ]);
            } elseif ($purchase->status === 'completed') {
                BelievePointPurchaseSettlementService::reverseCompletedPurchaseCredits($purchase);
            }

            return;
        }

        // processing, requires_action, requires_confirmation, etc.
        $delay = min(3600, max(30, 45 * (int) ceil($this->attempts() / 3)));
        Log::debug('Believe Points settlement job: payment still pending, will retry', [
            'purchase_id' => $this->purchaseId,
            'payment_intent_id' => $this->paymentIntentId,
            'pi_status' => $status,
            'attempt' => $this->attempts(),
            'delay_seconds' => $delay,
        ]);
        $this->release($delay);
    }
}
