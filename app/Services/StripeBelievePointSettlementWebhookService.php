<?php

namespace App\Services;

use App\Models\BelievePointPurchase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Laravel\Cashier\Cashier;

/**
 * Stripe webhook handlers for Believe Points settlement (gate 1: Stripe funds available).
 *
 * @see StripeBelievePointSettlementScheduleService
 * @see BelievePointBridgeReserveSettlementService Gate 2: Bridge reserve
 */
final class StripeBelievePointSettlementWebhookService
{
    /**
     * Pending Stripe balance became available — attempt immediate Processing → Available release.
     */
    public static function handleBalanceAvailable(): int
    {
        $released = BelievePointPurchaseSettlementService::releaseDueProcessingPoints();

        if ($released > 0) {
            Log::info('Believe Points: balance.available webhook released processing BP', [
                'released_purchases' => $released,
            ]);
        }

        return $released;
    }

    /**
     * @param  array<string, mixed>  $balanceTransaction
     */
    public static function handleBalanceTransaction(array $balanceTransaction): bool
    {
        $purchase = self::findPurchaseForBalanceTransaction($balanceTransaction);
        if ($purchase === null) {
            return false;
        }

        $synced = StripeBelievePointSettlementScheduleService::syncPurchaseFromBalanceTransactionPayload(
            $purchase,
            $balanceTransaction
        );

        if ($synced) {
            Log::info('Believe Points: synced purchase from Stripe balance_transaction webhook', [
                'purchase_id' => $purchase->id,
                'balance_transaction_id' => $balanceTransaction['id'] ?? null,
            ]);
        }

        self::attemptReleaseForPurchase($purchase->fresh());

        return $synced;
    }

    /**
     * Audit-only: attach Stripe payout ID to purchases whose balance transactions were included.
     *
     * @param  array<string, mixed>  $payout
     */
    public static function handlePayoutPaid(array $payout): int
    {
        $payoutId = trim((string) ($payout['id'] ?? ''));
        if ($payoutId === '' || ! str_starts_with($payoutId, 'po_')) {
            return 0;
        }

        $updated = 0;

        try {
            $stripe = Cashier::stripe();
            $params = ['payout' => $payoutId, 'limit' => 100];

            do {
                $page = $stripe->balanceTransactions->all($params);

                foreach ($page->data as $balanceTransaction) {
                    $txnId = (string) ($balanceTransaction->id ?? '');
                    if ($txnId === '') {
                        continue;
                    }

                    $count = BelievePointPurchase::query()
                        ->where(function ($q) use ($txnId) {
                            $q->where('stripe_balance_transaction_id', $txnId)
                                ->orWhere('stripe_settlement_reference', $txnId);
                        })
                        ->where(function ($q) use ($payoutId) {
                            $q->whereNull('stripe_payout_id')
                                ->orWhere('stripe_payout_id', '!=', $payoutId);
                        })
                        ->update(['stripe_payout_id' => $payoutId]);

                    $updated += $count;
                }

                $params['starting_after'] = $page->data[count($page->data) - 1]->id ?? null;
            } while ($page->has_more && ! empty($page->data));
        } catch (\Throwable $e) {
            Log::warning('Believe Points: payout.paid webhook could not link purchases', [
                'payout_id' => $payoutId,
                'message' => $e->getMessage(),
            ]);

            return $updated;
        }

        if ($updated > 0) {
            Log::info('Believe Points: linked Stripe payout to purchases (audit)', [
                'payout_id' => $payoutId,
                'purchase_count' => $updated,
            ]);
        }

        return $updated;
    }

    /**
     * @param  array<string, mixed>  $charge
     */
    public static function handleChargeRefunded(array $charge): bool
    {
        $purchase = self::findPurchaseForChargePayload($charge);
        if ($purchase === null) {
            return false;
        }

        $refundId = self::latestRefundIdFromCharge($charge);

        return self::markPurchaseStripeReversed(
            $purchase,
            BelievePointPurchaseSettlementStatusService::SETTLEMENT_REVERSED,
            'Stripe charge refunded.',
            $refundId
        );
    }

    /**
     * @param  array<string, mixed>  $dispute
     */
    public static function handleChargeDisputeCreated(array $dispute): bool
    {
        $chargeId = trim((string) ($dispute['charge'] ?? ''));
        if ($chargeId === '') {
            return false;
        }

        $purchase = self::findPurchaseForChargeId($chargeId);
        if ($purchase === null) {
            return false;
        }

        $reason = trim((string) ($dispute['reason'] ?? 'dispute'));
        $disputeId = trim((string) ($dispute['id'] ?? ''));

        return self::markPurchaseStripeReversed(
            $purchase,
            BelievePointPurchaseSettlementStatusService::SETTLEMENT_FAILED,
            'Stripe dispute opened: '.$reason.($disputeId !== '' ? ' ('.$disputeId.')' : ''),
            null
        );
    }

    public static function attemptReleaseForPurchase(BelievePointPurchase $purchase): void
    {
        $purchase->refresh();

        if (! BelievePointBridgeReserveSettlementService::purchaseReadyForRelease($purchase)) {
            return;
        }

        BelievePointPurchaseSettlementService::releasePurchasePoints($purchase);
    }

    /**
     * @param  array<string, mixed>  $balanceTransaction
     */
    private static function findPurchaseForBalanceTransaction(array $balanceTransaction): ?BelievePointPurchase
    {
        $txnId = trim((string) ($balanceTransaction['id'] ?? ''));
        if ($txnId !== '') {
            $byTxn = BelievePointPurchase::query()
                ->where(function ($q) use ($txnId) {
                    $q->where('stripe_balance_transaction_id', $txnId)
                        ->orWhere('stripe_settlement_reference', $txnId);
                })
                ->orderByDesc('id')
                ->first();

            if ($byTxn !== null) {
                return $byTxn;
            }
        }

        $source = trim((string) ($balanceTransaction['source'] ?? ''));
        if ($source !== '' && str_starts_with($source, 'ch_')) {
            return self::findPurchaseForChargeId($source);
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $charge
     */
    private static function findPurchaseForChargePayload(array $charge): ?BelievePointPurchase
    {
        $chargeId = trim((string) ($charge['id'] ?? ''));
        if ($chargeId !== '') {
            $byCharge = self::findPurchaseForChargeId($chargeId);
            if ($byCharge !== null) {
                return $byCharge;
            }
        }

        $paymentIntentId = trim((string) ($charge['payment_intent'] ?? ''));

        return self::findPurchaseForPaymentIntentId($paymentIntentId);
    }

    private static function findPurchaseForChargeId(string $chargeId): ?BelievePointPurchase
    {
        $chargeId = trim($chargeId);
        if ($chargeId === '' || ! str_starts_with($chargeId, 'ch_')) {
            return null;
        }

        try {
            $charge = Cashier::stripe()->charges->retrieve($chargeId);
            $paymentIntentId = trim((string) ($charge->payment_intent ?? ''));

            return self::findPurchaseForPaymentIntentId($paymentIntentId);
        } catch (\Throwable $e) {
            Log::warning('Believe Points: could not resolve purchase from charge', [
                'charge_id' => $chargeId,
                'message' => $e->getMessage(),
            ]);

            return null;
        }
    }

    private static function findPurchaseForPaymentIntentId(string $paymentIntentId): ?BelievePointPurchase
    {
        $paymentIntentId = trim($paymentIntentId);
        if ($paymentIntentId === '' || ! str_starts_with($paymentIntentId, 'pi_')) {
            return null;
        }

        return BelievePointPurchase::query()
            ->where('stripe_payment_intent_id', $paymentIntentId)
            ->orderByDesc('id')
            ->first();
    }

    /**
     * @param  array<string, mixed>  $charge
     */
    private static function latestRefundIdFromCharge(array $charge): ?string
    {
        $refunds = $charge['refunds']['data'] ?? null;
        if (! is_array($refunds) || $refunds === []) {
            return null;
        }

        $last = end($refunds);
        $id = is_array($last) ? ($last['id'] ?? null) : null;

        return is_string($id) && $id !== '' ? $id : null;
    }

    private static function markPurchaseStripeReversed(
        BelievePointPurchase $purchase,
        string $settlementStatus,
        string $message,
        ?string $stripeRefundId = null,
    ): bool {
        if ($purchase->refunded_at !== null || $purchase->status === 'failed') {
            return false;
        }

        return (bool) DB::transaction(function () use ($purchase, $settlementStatus, $message, $stripeRefundId) {
            /** @var BelievePointPurchase|null $locked */
            $locked = BelievePointPurchase::query()->lockForUpdate()->find($purchase->id);
            if ($locked === null || $locked->refunded_at !== null) {
                return false;
            }

            if ($locked->status === 'completed') {
                if (! BelievePointPurchaseSettlementService::reverseCompletedPurchaseCredits($locked)) {
                    Log::warning('Believe Points: Stripe reversal webhook could not claw back credits', [
                        'purchase_id' => $locked->id,
                    ]);

                    return false;
                }

                $locked->refresh();
            }

            $updates = [
                'settlement_status' => $settlementStatus,
                'failure_message' => $message,
            ];

            if ($settlementStatus === BelievePointPurchaseSettlementStatusService::SETTLEMENT_REVERSED) {
                $updates['refunded_at'] = now();
                $updates['refund_status'] = 'succeeded';
                if ($stripeRefundId) {
                    $updates['stripe_refund_id'] = $stripeRefundId;
                }
            }

            $locked->update($updates);

            Log::info('Believe Points: purchase marked from Stripe reversal webhook', [
                'purchase_id' => $locked->id,
                'settlement_status' => $settlementStatus,
            ]);

            return true;
        });
    }
}
