<?php

namespace App\Jobs;

use App\Models\AdminSetting;
use App\Models\BelievePointPurchase;
use App\Models\User;
use App\Services\BelievePointsPaymentMethodSyncService;
use App\Services\DonationProcessingFeeEstimator;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Laravel\Cashier\Cashier;
use Stripe\Exception\ApiErrorException;

class ProcessBelievePointsAutoReplenishJob
{
    use Dispatchable, SerializesModels;

    public function __construct(public int $userId) {}

    public function handle(): void
    {
        if (! (bool) AdminSetting::get('believe_points_enabled', true)) {
            return;
        }

        $user = User::query()->find($this->userId);
        if (! $user || ! $user->believe_points_auto_replenish_enabled) {
            return;
        }

        $pmId = $user->believe_points_auto_replenish_pm_id;
        if (! $pmId || ! $user->hasStripeId()) {
            return;
        }

        $threshold = (float) ($user->believe_points_auto_replenish_threshold ?? 0);
        $amount = (float) ($user->believe_points_auto_replenish_amount ?? 0);
        $minPurchase = (float) AdminSetting::get('believe_points_min_purchase', 1.00);
        $maxPurchase = (float) AdminSetting::get('believe_points_max_purchase', 10000.00);

        if ($amount < $minPurchase || $amount > $maxPurchase) {
            return;
        }

        Cache::lock('believe-points-auto-replenish:'.$user->id, 120)->block(10, function () use ($user, $threshold, $amount, $pmId) {
            $user->refresh();

            if (! $user->believe_points_auto_replenish_enabled || $user->believe_points_auto_replenish_pm_id !== $pmId) {
                return;
            }

            if ($user->currentBelievePoints() > $threshold) {
                return;
            }

            if ($user->believe_points_last_auto_replenish_at
                && $user->believe_points_last_auto_replenish_at->gt(now()->subHour())) {
                return;
            }

            $checkoutTotal = round(DonationProcessingFeeEstimator::grossUpCardChargeUsdForNetGiftUsd($amount), 2);
            $feeAddon = round(max(0, $checkoutTotal - $amount), 2);

            $purchase = BelievePointPurchase::create([
                'user_id' => $user->id,
                'amount' => $amount,
                'checkout_total' => $checkoutTotal,
                'processing_fee_estimate' => $feeAddon,
                'points' => $amount,
                'status' => 'pending',
                'source' => 'auto_replenish',
                'payment_rail' => 'card',
            ]);

            $stripe = Cashier::stripe();
            $amountCents = (int) round($checkoutTotal * 100);

            try {
                BelievePointsPaymentMethodSyncService::ensurePaymentMethodBelongsToCustomer($user, $pmId);
                $user->refresh();

                $intent = $stripe->paymentIntents->create([
                    'amount' => $amountCents,
                    'currency' => config('cashier.currency'),
                    'customer' => $user->stripe_id,
                    'payment_method' => $pmId,
                    'off_session' => true,
                    'confirm' => true,
                    'description' => 'Auto-replenish Believe Points',
                    'metadata' => [
                        'purchase_id' => (string) $purchase->id,
                        'user_id' => (string) $user->id,
                        'type' => 'believe_points_auto_replenish',
                    ],
                ], [
                    'idempotency_key' => 'bp-ar-'.$purchase->id,
                ]);

                if ($intent->status === 'succeeded') {
                    $purchase->update([
                        'stripe_payment_intent_id' => $intent->id,
                        'status' => 'completed',
                        'failure_code' => null,
                        'failure_message' => null,
                    ]);
                    $user->addBelievePoints($amount);
                    $user->update(['believe_points_last_auto_replenish_at' => now()]);

                    Log::info('Believe Points auto-replenish succeeded', [
                        'user_id' => $user->id,
                        'purchase_id' => $purchase->id,
                        'amount' => $amount,
                    ]);
                } else {
                    $err = $intent->last_payment_error ?? null;
                    $failureCode = $err ? ($err->code ?? null) : null;
                    $failureMessage = $err ? ($err->message ?? null) : null;
                    if ($failureMessage === null) {
                        $failureMessage = 'Payment status: '.$intent->status;
                    }
                    $purchase->update([
                        'status' => 'failed',
                        'stripe_payment_intent_id' => $intent->id,
                        'failure_code' => $failureCode,
                        'failure_message' => $failureMessage,
                    ]);
                    $this->disableAutoReplenishOnFailure($user->fresh(), $failureCode ?? 'payment_intent_status_'.$intent->status);
                }
            } catch (\Throwable $e) {
                $failureCode = $e instanceof ApiErrorException ? $e->getStripeCode() : 'auto_replenish_error';
                $purchase->update([
                    'status' => 'failed',
                    'failure_code' => $failureCode,
                    'failure_message' => $e->getMessage(),
                ]);
                $this->disableAutoReplenishOnFailure($user->fresh(), $failureCode ?? $e->getMessage());
                Log::warning('Believe Points auto-replenish error', [
                    'user_id' => $user->id,
                    'purchase_id' => $purchase->id,
                    'error' => $e->getMessage(),
                    'code' => $failureCode,
                ]);
            }
        });
    }

    private function disableAutoReplenishOnFailure(User $user, string $reason): void
    {
        $user->update([
            'believe_points_auto_replenish_enabled' => false,
        ]);

        Log::info('Believe Points auto-replenish disabled after failure', [
            'user_id' => $user->id,
            'reason' => $reason,
        ]);
    }
}
