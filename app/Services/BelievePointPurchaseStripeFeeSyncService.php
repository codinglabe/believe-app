<?php

namespace App\Services;

use App\Models\BelievePointPurchase;
use App\Models\Transaction;
use Illuminate\Support\Facades\Log;
use Laravel\Cashier\Cashier;
use Stripe\Exception\ApiErrorException;

/**
 * Sync actual Stripe Balance Transaction fees onto Payment Ledger rows for BP purchases.
 * Stripe is the source of truth — never use estimates once actuals are available.
 */
final class BelievePointPurchaseStripeFeeSyncService
{
    public static function syncPurchase(BelievePointPurchase $purchase, ?string $paymentIntentId = null): bool
    {
        $piId = trim((string) ($paymentIntentId ?? $purchase->stripe_payment_intent_id ?? ''));
        if ($piId === '') {
            return false;
        }

        $financials = self::retrieveBalanceTransactionFinancials($piId);
        if ($financials === null) {
            return false;
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

        if (! $tx) {
            return false;
        }

        $platformFee = $purchase->platform_fee !== null
            ? round((float) $purchase->platform_fee, 2)
            : 0.0;
        $stripeFee = round((float) $financials['stripe_fee_usd'], 2);

        $existingMeta = is_array($tx->meta) ? $tx->meta : [];
        $tx->update([
            'fee' => round($stripeFee + $platformFee, 2),
            'meta' => array_merge($existingMeta, [
                'stripe_fee' => $stripeFee,
                'stripe_processing_fee' => $stripeFee,
                'stripe_fee_amount' => $stripeFee,
                'payment_processor_fee' => $stripeFee,
                'stripe_payment_intent' => $piId,
                'stripe_balance_transaction_id' => $financials['balance_transaction_id'],
                'stripe_amount_received_usd' => $financials['amount_received_usd'],
                'stripe_net_usd' => $financials['net_usd'],
                'stripe_gross_usd' => $financials['gross_usd'],
                'stripe_fee_sync_source' => 'balance_transaction',
                'stripe_fee_synced_at' => now()->toIso8601String(),
            ]),
        ]);

        if ($financials['balance_transaction_id']) {
            $purchase->update([
                'stripe_balance_transaction_id' => $financials['balance_transaction_id'],
            ]);
        }

        Log::info('Believe Points purchase: synced Stripe fee from balance transaction', [
            'purchase_id' => $purchase->id,
            'payment_intent_id' => $piId,
            'stripe_fee_usd' => $stripeFee,
            'balance_transaction_id' => $financials['balance_transaction_id'],
        ]);

        return true;
    }

    /**
     * @return array{
     *     stripe_fee_usd: float,
     *     amount_received_usd: float|null,
     *     net_usd: float|null,
     *     gross_usd: float|null,
     *     balance_transaction_id: string|null
     * }|null
     */
    private static function retrieveBalanceTransactionFinancials(string $paymentIntentId): ?array
    {
        try {
            $pi = Cashier::stripe()->paymentIntents->retrieve($paymentIntentId, [
                'expand' => ['latest_charge.balance_transaction'],
            ]);
        } catch (ApiErrorException $e) {
            Log::debug('Believe Points Stripe fee sync: PaymentIntent retrieve failed', [
                'payment_intent_id' => $paymentIntentId,
                'error' => $e->getMessage(),
            ]);

            return null;
        }

        $charge = $pi->latest_charge ?? null;
        $bt = is_object($charge) ? ($charge->balance_transaction ?? null) : null;

        $feeUsd = 0.0;
        $netUsd = null;
        $grossUsd = null;
        $btId = null;

        if (is_object($bt)) {
            if (isset($bt->fee)) {
                $feeUsd = round((float) $bt->fee / 100, 2);
            }
            if (isset($bt->net)) {
                $netUsd = round((float) $bt->net / 100, 2);
            }
            if (isset($bt->amount)) {
                $grossUsd = round((float) $bt->amount / 100, 2);
            }
            $btId = is_string($bt->id ?? null) ? $bt->id : null;
        }

        $amountReceivedUsd = null;
        if (isset($pi->amount_received)) {
            $amountReceivedUsd = round((float) $pi->amount_received / 100, 2);
        }

        return [
            'stripe_fee_usd' => $feeUsd,
            'amount_received_usd' => $amountReceivedUsd,
            'net_usd' => $netUsd,
            'gross_usd' => $grossUsd,
            'balance_transaction_id' => $btId,
        ];
    }
}
