<?php

namespace App\Services;

use App\Models\BelievePointPurchase;
use App\Models\Transaction;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class BelievePointPurchaseSettlementService
{
    /**
     * Bank (ACH) Believe Points purchases: $1 USD → 0.10 added to the user's `reward_points` column (Merchant Hub balance).
     */
    public static function bankPurchaseRewardPointsFromAmountUsd(float $amountUsd): float
    {
        return round(max(0, $amountUsd) * 0.1, 2);
    }

    public static function settleCheckoutPurchase(int $purchaseId, string $paymentIntentId): bool
    {
        return (bool) DB::transaction(function () use ($purchaseId, $paymentIntentId) {
            /** @var BelievePointPurchase|null $purchase */
            $purchase = BelievePointPurchase::lockForUpdate()->find($purchaseId);
            if (! $purchase || $purchase->status !== 'pending') {
                return false;
            }

            $user = $purchase->user;
            $user->addBelievePoints((float) $purchase->points);

            $rewardAwarded = null;
            if (($purchase->payment_rail ?? 'card') === 'bank') {
                $rp = self::bankPurchaseRewardPointsFromAmountUsd((float) $purchase->amount);
                if ($rp > 0.0) {
                    $user->addRewardPoints(
                        $rp,
                        'believe_points_bank_purchase',
                        $purchase->id,
                        'Reward points for Believe Points purchase paid by bank (ACH)',
                        ['amount_usd' => (float) $purchase->amount]
                    );
                    $rewardAwarded = $rp;
                }
            }

            $purchase->update([
                'stripe_payment_intent_id' => $paymentIntentId,
                'status' => 'completed',
                'reward_points_awarded' => $rewardAwarded,
            ]);

            Log::info('Believe Points checkout purchase settled', [
                'purchase_id' => $purchase->id,
                'user_id' => $purchase->user_id,
                'payment_rail' => $purchase->payment_rail,
                'reward_points_awarded' => $rewardAwarded,
            ]);

            return true;
        });
    }

    /**
     * Admin ledger: one `transactions` row per Believe Point purchase (any status), kept in sync on save.
     */
    public static function syncAdminLedgerPurchaseRow(BelievePointPurchase $purchase): void
    {
        if (! $purchase->user_id) {
            return;
        }

        $tx = Transaction::query()
            ->where('related_id', $purchase->id)
            ->where('type', 'purchase')
            ->where(function ($q) {
                $q->where('related_type', BelievePointPurchase::class)
                    ->orWhere('related_type', 'like', '%BelievePointPurchase');
            })
            ->orderBy('id')
            ->first();

        $gross = $purchase->checkout_total !== null ? (float) $purchase->checkout_total : (float) $purchase->amount;
        $feeEst = $purchase->processing_fee_estimate !== null ? (float) $purchase->processing_fee_estimate : 0.0;
        $rail = $purchase->payment_rail ?? 'card';
        $paymentMethod = $rail === 'bank' ? 'stripe_ach' : 'stripe_card';

        $status = match ($purchase->status) {
            'completed' => Transaction::STATUS_COMPLETED,
            'failed' => Transaction::STATUS_FAILED,
            'cancelled' => Transaction::STATUS_CANCELLED,
            default => Transaction::STATUS_PENDING,
        };

        $piId = $purchase->stripe_payment_intent_id ? trim((string) $purchase->stripe_payment_intent_id) : '';
        $referenceId = $piId !== ''
            ? $piId
            : 'believe_points_purchase:'.$purchase->id;

        $meta = [
            'source' => 'believe_points_purchase',
            'believe_point_purchase_id' => $purchase->id,
            'believe_point_purchase_status' => $purchase->status,
            'stripe_payment_intent_id' => $piId !== '' ? $piId : null,
            'stripe_session_id' => $purchase->stripe_session_id,
            'intended_points' => (float) $purchase->points,
            'points_credited' => $purchase->status === 'completed' ? (float) $purchase->points : null,
            'base_points_usd' => (float) $purchase->amount,
            'checkout_total_usd' => $purchase->checkout_total !== null ? (float) $purchase->checkout_total : null,
            'processing_fee_estimate' => $feeEst > 0 ? round($feeEst, 2) : null,
            'payment_rail' => $rail,
            'gross_amount' => round(max(0, $gross), 2),
            'is_auto_replenish' => ($purchase->source ?? '') === 'auto_replenish',
            'failure_code' => $purchase->failure_code,
            'failure_message' => $purchase->failure_message,
            'description' => self::ledgerPurchaseDescription($purchase),
        ];

        if ($purchase->refunded_at) {
            $meta['refunded_at'] = $purchase->refunded_at->toIso8601String();
        }
        if ($purchase->stripe_refund_id) {
            $meta['stripe_refund_id'] = (string) $purchase->stripe_refund_id;
        }
        if ($purchase->refund_status) {
            $meta['refund_status'] = (string) $purchase->refund_status;
        }

        $processedAt = in_array($purchase->status, ['completed', 'failed', 'cancelled'], true)
            ? ($purchase->updated_at ?? now())
            : null;

        $attrs = [
            'user_id' => $purchase->user_id,
            'related_id' => $purchase->id,
            'related_type' => BelievePointPurchase::class,
            'type' => 'purchase',
            'status' => $status,
            'amount' => round(max(0, $gross), 2),
            'fee' => round(max(0, $feeEst), 2),
            'currency' => 'USD',
            'payment_method' => $paymentMethod,
            'transaction_id' => $referenceId,
            'processed_at' => $processedAt,
            'meta' => array_filter(
                $meta,
                static fn ($v) => $v !== null && $v !== ''
            ),
        ];

        if ($tx) {
            $tx->update($attrs);
        } else {
            Transaction::create($attrs);
        }
    }

    private static function ledgerPurchaseDescription(BelievePointPurchase $purchase): string
    {
        $auto = ($purchase->source ?? '') === 'auto_replenish';

        return match ($purchase->status) {
            'pending' => $auto
                ? 'Believe Points auto-replenish (pending)'
                : 'Believe Points purchase (pending checkout)',
            'cancelled' => $auto
                ? 'Believe Points auto-replenish (cancelled)'
                : 'Believe Points purchase (cancelled)',
            'failed' => $auto
                ? 'Believe Points auto-replenish (failed)'
                : 'Believe Points purchase (failed)',
            default => $auto
                ? 'Believe Points auto-replenish (Stripe)'
                : 'Believe Points purchase (Stripe)',
        };
    }

    /**
     * Reverse Believe Points + Merchant Hub reward points for a completed purchase (e.g. payment later voided).
     */
    public static function reverseCompletedPurchaseCredits(BelievePointPurchase $purchase): bool
    {
        return (bool) DB::transaction(function () use ($purchase) {
            /** @var BelievePointPurchase|null $p */
            $p = BelievePointPurchase::lockForUpdate()->find($purchase->id);
            if (! $p || $p->status !== 'completed') {
                return false;
            }

            $user = $p->user;
            if (! $user) {
                return false;
            }

            $points = (float) $p->points;
            if ($points > 0 && ! $user->deductBelievePoints($points)) {
                Log::warning('Believe Points reversal: could not deduct believe points', [
                    'purchase_id' => $p->id,
                    'user_id' => $user->id,
                ]);

                return false;
            }

            $rewardClaw = round((float) ($p->reward_points_awarded ?? 0), 2);
            if ($rewardClaw > 0) {
                if (! $user->deductRewardPoints(
                    $rewardClaw,
                    'believe_points_purchase_voided',
                    $p->id,
                    'Reward points reversed after Believe Points purchase payment was canceled or failed',
                    ['purchase_id' => $p->id]
                )) {
                    Log::warning('Believe Points reversal: could not deduct reward points', [
                        'purchase_id' => $p->id,
                        'user_id' => $user->id,
                        'reward_points' => $rewardClaw,
                    ]);
                }
            }

            $p->update([
                'status' => 'failed',
                'failure_message' => 'Credits reversed: payment did not complete or was voided.',
                'reward_points_awarded' => null,
            ]);

            Log::info('Believe Points purchase credits reversed', [
                'purchase_id' => $p->id,
                'user_id' => $user->id,
            ]);

            return true;
        });
    }
}
