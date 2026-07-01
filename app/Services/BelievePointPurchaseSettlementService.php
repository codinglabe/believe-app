<?php

namespace App\Services;

use App\Enums\PaymentTransactionType;
use App\Models\BelievePointPurchase;
use App\Models\PaymentTransaction;
use App\Models\Transaction;
use App\Services\Admin\UnifiedLedgerTransactionWriter;
use App\Support\StripeReferenceMode;
use App\Support\UnifiedLedgerBpStatus;
use App\Support\UnifiedLedgerBrpActivity;
use App\Support\UnifiedLedgerType;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class BelievePointPurchaseSettlementService
{
    public static function brpEarnedForPurchase(BelievePointPurchase $purchase): float
    {
        return BelievePointsPurchaseCalculationService::brpEarned((float) $purchase->amount, $purchase->user);
    }

    public static function settleCheckoutPurchase(int $purchaseId, string $paymentIntentId): bool
    {
        return (bool) DB::transaction(function () use ($purchaseId, $paymentIntentId) {
            /** @var BelievePointPurchase|null $purchase */
            $purchase = BelievePointPurchase::lockForUpdate()->find($purchaseId);
            if (! $purchase || $purchase->status !== 'pending') {
                return false;
            }

            return self::creditPurchaseAfterPayment($purchase, $paymentIntentId);
        });
    }

    public static function creditPurchaseAfterPayment(BelievePointPurchase $purchase, ?string $paymentIntentId = null): bool
    {
        $user = $purchase->user;
        if (! $user) {
            return false;
        }

        $rail = ($purchase->payment_rail ?? 'card') === 'bank' ? 'bank' : 'card';
        $points = (float) $purchase->points;
        $isBank = $rail === 'bank';

        $user->addProcessingBelievePoints($points);
        BelievePointProcessingLotService::createLotForPurchase($purchase, $user, $points);

        $rewardAwarded = null;
        $rp = self::brpEarnedForPurchase($purchase);
        if ($rp > 0.0) {
            $user->addRewardPoints(
                $rp,
                $isBank ? 'believe_points_ach_purchase' : 'believe_points_card_purchase',
                $purchase->id,
                $isBank
                    ? 'Believe Reward Points for Believe Points purchase paid by bank (ACH)'
                    : 'Believe Reward Points for Believe Points purchase paid by card',
                ['amount_usd' => (float) $purchase->amount, 'brp_value' => BelievePointsPurchaseSettingsService::brpValue()]
            );
            $rewardAwarded = $rp;
        }

        $availableAt = StripeBelievePointSettlementScheduleService::resolvePointsAvailableAt(
            $purchase,
            $paymentIntentId
        );
        $stripeReference = StripeBelievePointSettlementScheduleService::stripeSettlementReference($paymentIntentId);

        $updates = [
            'status' => 'completed',
            'reward_points_awarded' => $rewardAwarded,
            'stripe_funds_available_at' => $availableAt,
            'stripe_settlement_reference' => $stripeReference,
            'settlement_status' => BelievePointPurchaseSettlementStatusService::SETTLEMENT_PROCESSING,
            'points_available_at' => null,
            'points_released' => false,
        ];
        if ($paymentIntentId) {
            $updates['stripe_payment_intent_id'] = $paymentIntentId;
        }
        $purchase->update($updates);

        BelievePointBridgeReserveSettlementService::autoConfirmIfBridgeNotRequired($purchase->fresh());
        BelievePointBridgeReserveSettlementService::syncPurchaseReleaseSchedule($purchase->fresh());

        Log::info('Believe Points checkout purchase settled', [
            'purchase_id' => $purchase->id,
            'user_id' => $purchase->user_id,
            'payment_rail' => $purchase->payment_rail,
            'reward_points_awarded' => $rewardAwarded,
            'points_available_at' => $availableAt->toIso8601String(),
        ]);

        PaymentTransaction::create([
            'user_id' => $purchase->user_id,
            'transaction_type' => PaymentTransactionType::BelievePointsPurchase->value,
            'payable_type' => BelievePointPurchase::class,
            'payable_id' => $purchase->id,
            'payment_method' => $isBank ? 'stripe_ach' : 'stripe_card',
            'amount' => $purchase->amount,
            'status' => PaymentTransaction::STATUS_COMPLETED,
            'external_reference' => $paymentIntentId ?? ('believe_points_purchase_'.$purchase->id),
            'completed_at' => now(),
            'metadata' => ['believe_point_purchase_id' => $purchase->id],
        ]);

        BelievePointsWalletLedgerService::recordPurchaseProcessing($purchase->fresh());

        if ($paymentIntentId) {
            BelievePointPurchaseStripeFeeSyncService::syncPurchase($purchase->fresh(), $paymentIntentId);
        }

        return true;
    }

    public static function releaseDueProcessingPoints(): int
    {
        $count = 0;
        BelievePointPurchase::query()
            ->where('status', 'completed')
            ->where('points_released', false)
            ->whereNotNull('stripe_funds_available_at')
            ->where('stripe_funds_available_at', '<=', now())
            ->orderBy('id')
            ->each(function (BelievePointPurchase $purchase) use (&$count) {
                if (! BelievePointBridgeReserveSettlementService::purchaseReadyForRelease($purchase)) {
                    return;
                }

                if (self::releasePurchasePoints($purchase)) {
                    $count++;
                }
            });

        return $count;
    }

    public static function releasePurchasePoints(BelievePointPurchase $purchase): bool
    {
        return BelievePointProcessingLotService::releaseLotsForPurchase($purchase);
    }

    public static function settleManualPurchase(
        int $purchaseId,
        string $externalReference,
        string $paymentMethod,
        ?int $verifiedByUserId = null,
        ?string $adminNotes = null
    ): bool {
        return (bool) DB::transaction(function () use ($purchaseId, $externalReference, $paymentMethod, $verifiedByUserId, $adminNotes) {
            /** @var BelievePointPurchase|null $purchase */
            $purchase = BelievePointPurchase::lockForUpdate()->find($purchaseId);
            if (! $purchase) {
                return false;
            }

            if ($purchase->status === 'completed') {
                return true;
            }

            if ($purchase->status !== 'pending') {
                return false;
            }

            $user = $purchase->user;
            if (! $user) {
                return false;
            }

            $user->addBelievePoints((float) $purchase->points);

            $purchase->update([
                'status' => 'completed',
                'payment_method' => $paymentMethod,
                'points_released' => true,
                'points_available_at' => now(),
            ]);

            $paymentTx = PaymentTransaction::query()
                ->where('payable_type', BelievePointPurchase::class)
                ->where('payable_id', $purchase->id)
                ->lockForUpdate()
                ->first();

            if ($paymentTx) {
                $txUpdates = [
                    'status' => PaymentTransaction::STATUS_COMPLETED,
                    'payment_method' => $paymentMethod,
                    'external_reference' => $externalReference,
                    'completed_at' => now(),
                ];
                if ($verifiedByUserId) {
                    $txUpdates['verified_by'] = $verifiedByUserId;
                    $txUpdates['verified_at'] = now();
                }
                if ($adminNotes) {
                    $txUpdates['admin_notes'] = $adminNotes;
                }
                $paymentTx->update($txUpdates);
            } else {
                PaymentTransaction::create([
                    'user_id' => $purchase->user_id,
                    'transaction_type' => PaymentTransactionType::BelievePointsPurchase->value,
                    'payable_type' => BelievePointPurchase::class,
                    'payable_id' => $purchase->id,
                    'payment_method' => $paymentMethod,
                    'amount' => $purchase->amount,
                    'status' => PaymentTransaction::STATUS_COMPLETED,
                    'external_reference' => $externalReference,
                    'completed_at' => now(),
                    'verified_by' => $verifiedByUserId,
                    'verified_at' => $verifiedByUserId ? now() : null,
                    'admin_notes' => $adminNotes,
                    'metadata' => ['believe_point_purchase_id' => $purchase->id],
                ]);
            }

            Log::info('Believe Points manual purchase settled', [
                'purchase_id' => $purchase->id,
                'user_id' => $purchase->user_id,
                'payment_method' => $paymentMethod,
            ]);

            return true;
        });
    }

    public static function rejectManualPurchase(
        BelievePointPurchase $purchase,
        int $adminUserId,
        ?string $adminNotes = null
    ): bool {
        return (bool) DB::transaction(function () use ($purchase, $adminUserId, $adminNotes) {
            $purchase = BelievePointPurchase::lockForUpdate()->find($purchase->id);
            if (! $purchase || $purchase->status !== 'pending') {
                return false;
            }

            $purchase->update([
                'status' => 'failed',
                'failure_message' => $adminNotes ?? 'Payment rejected by admin.',
            ]);

            PaymentTransaction::query()
                ->where('payable_type', BelievePointPurchase::class)
                ->where('payable_id', $purchase->id)
                ->update([
                    'status' => PaymentTransaction::STATUS_REJECTED,
                    'verified_by' => $adminUserId,
                    'verified_at' => now(),
                    'admin_notes' => $adminNotes,
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
        $platformFee = $purchase->platform_fee !== null ? (float) $purchase->platform_fee : 0.0;
        $rail = $purchase->payment_rail ?? 'card';
        $paymentMethod = $purchase->payment_method
            ?? ($rail === 'bank' ? 'stripe_ach' : 'stripe_card');

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

        $meta = StripeReferenceMode::withStoredLivemode([
            'source' => 'believe_points_purchase',
            'believe_point_purchase_id' => $purchase->id,
            'believe_point_purchase_status' => $purchase->status,
            'stripe_payment_intent_id' => $piId !== '' ? $piId : null,
            'stripe_session_id' => $purchase->stripe_session_id,
            'intended_points' => (float) $purchase->points,
            'points_credited' => $purchase->status === 'completed' ? (float) $purchase->points : null,
            'bp_status' => $purchase->status === 'completed'
                ? ($purchase->points_released ? 'available' : 'processing')
                : null,
            'brp_awarded' => $purchase->reward_points_awarded !== null
                ? round((float) $purchase->reward_points_awarded, 2)
                : null,
            'is_trusted_instrument' => (bool) $purchase->is_trusted_instrument,
            'base_points_usd' => (float) $purchase->amount,
            'checkout_total_usd' => $purchase->checkout_total !== null ? (float) $purchase->checkout_total : null,
            'processing_fee_estimate' => $feeEst > 0 ? round($feeEst, 2) : null,
            'platform_fee' => $platformFee > 0 ? round($platformFee, 2) : null,
            'payment_rail' => $rail,
            'gross_amount' => round(max(0, $gross), 2),
            'is_auto_replenish' => ($purchase->source ?? '') === 'auto_replenish',
            'failure_code' => $purchase->failure_code,
            'failure_message' => $purchase->failure_message,
            'description' => self::ledgerPurchaseDescription($purchase),
        ], $purchase->stripe_session_id, $piId !== '' ? $piId : null);

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
            'ledger_type' => UnifiedLedgerType::MONEY,
            'bp_status' => UnifiedLedgerBpStatus::NA,
            'brp_activity_type' => UnifiedLedgerBrpActivity::NA,
            'current_owner' => null,
            'available_at' => null,
            'status' => $status,
            'amount' => round(max(0, $gross), 2),
            'fee' => round(max(0, $feeEst + $platformFee), 2),
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
            $existingMeta = is_array($tx->meta) ? $tx->meta : [];
            $feeSynced = in_array($existingMeta['stripe_fee_sync_source'] ?? '', ['webhook', 'balance_transaction'], true);
            if ($feeSynced) {
                $attrs['fee'] = (float) $tx->fee;
                $attrs['meta'] = array_merge($existingMeta, $attrs['meta']);
            }
            $tx->update($attrs);
            $keepId = (int) $tx->id;
        } else {
            $keepId = (int) Transaction::query()->create($attrs)->id;
        }

        $purchase->loadMissing('user');
        if ($purchase->user) {
            UnifiedLedgerTransactionWriter::syncBpCreditRow($purchase, $purchase->user);
        }

        self::pruneDuplicateMoneyPurchaseRows($purchase, $keepId);
    }

    /**
     * Keep a single Money ledger row per BP purchase (legacy syncs may have created extras).
     */
    private static function pruneDuplicateMoneyPurchaseRows(BelievePointPurchase $purchase, ?int $keepId): void
    {
        if ($keepId === null) {
            return;
        }

        Transaction::query()
            ->where('related_id', $purchase->id)
            ->where('type', 'purchase')
            ->where(function ($q) {
                $q->where('related_type', BelievePointPurchase::class)
                    ->orWhere('related_type', 'like', '%BelievePointPurchase');
            })
            ->where(function ($q) {
                $q->whereNull('ledger_type')
                    ->orWhere('ledger_type', UnifiedLedgerType::MONEY);
            })
            ->where('id', '!=', $keepId)
            ->delete();
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
     * Reverse Believe Points + Believe Reward Points (BRP) for a completed purchase (e.g. payment later voided).
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
            $deducted = false;
            if ($points > 0) {
                if ($p->points_released) {
                    $deducted = $user->deductBelievePoints($points);
                } else {
                    $deducted = $user->deductProcessingBelievePoints($points);
                }
            } else {
                $deducted = true;
            }

            if (! $deducted) {
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
                'settlement_status' => BelievePointPurchaseSettlementStatusService::SETTLEMENT_REVERSED,
            ]);

            Log::info('Believe Points purchase credits reversed', [
                'purchase_id' => $p->id,
                'user_id' => $user->id,
            ]);

            return true;
        });
    }
}
