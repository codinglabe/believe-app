<?php

namespace App\Services;

use App\Models\BelievePointPurchase;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Laravel\Cashier\Cashier;

/**
 * When purchased BP becomes Available — Stripe fund availability (gate 1 of 2).
 * Gate 2: Bridge reserve credit via {@see BelievePointBridgeReserveSettlementService}.
 */
final class StripeBelievePointSettlementScheduleService
{
    public static function resolvePointsAvailableAt(BelievePointPurchase $purchase, ?string $paymentIntentId): Carbon
    {
        $fromStripe = self::availableOnFromPaymentIntent($paymentIntentId);
        if ($fromStripe !== null) {
            return $fromStripe;
        }

        $rail = ($purchase->payment_rail ?? 'card') === 'bank' ? 'bank' : 'card';
        $days = $rail === 'bank'
            ? BelievePointsPurchaseSettingsService::achSettlementBusinessDays()
            : BelievePointsPurchaseSettingsService::cardSettlementBusinessDays();

        return Carbon::now()->addWeekdays(max(0, $days));
    }

    public static function stripeSettlementReference(?string $paymentIntentId): ?string
    {
        $paymentIntentId = trim((string) ($paymentIntentId ?? ''));
        if ($paymentIntentId === '' || ! str_starts_with($paymentIntentId, 'pi_')) {
            return null;
        }

        try {
            $stripe = Cashier::stripe();
            $intent = $stripe->paymentIntents->retrieve($paymentIntentId, [
                'expand' => ['latest_charge.balance_transaction'],
            ]);

            $charge = $intent->latest_charge ?? null;
            if (is_string($charge)) {
                $charge = $stripe->charges->retrieve($charge, ['expand' => ['balance_transaction']]);
            }

            $balanceTransaction = is_object($charge) ? ($charge->balance_transaction ?? null) : null;
            if (is_string($balanceTransaction)) {
                return $balanceTransaction;
            }

            if (is_object($balanceTransaction) && ! empty($balanceTransaction->id)) {
                return (string) $balanceTransaction->id;
            }
        } catch (\Throwable $e) {
            Log::warning('Believe Points: could not read Stripe settlement reference', [
                'payment_intent_id' => $paymentIntentId,
                'message' => $e->getMessage(),
            ]);
        }

        return $paymentIntentId;
    }

    /**
     * @param  array<string, mixed>  $balanceTransaction
     */
    public static function parseAvailableOnFromBalanceTransactionPayload(array $balanceTransaction): ?Carbon
    {
        $availableOn = $balanceTransaction['available_on'] ?? null;
        if ($availableOn !== null && is_numeric($availableOn)) {
            return Carbon::createFromTimestamp((int) $availableOn);
        }

        return null;
    }

    /**
     * Refresh Stripe fund availability from a balance_transaction webhook/API payload.
     *
     * @param  array<string, mixed>  $balanceTransaction
     */
    public static function syncPurchaseFromBalanceTransactionPayload(
        BelievePointPurchase $purchase,
        array $balanceTransaction,
    ): bool {
        $availableOn = self::parseAvailableOnFromBalanceTransactionPayload($balanceTransaction);
        if ($availableOn === null) {
            return false;
        }

        $txnId = trim((string) ($balanceTransaction['id'] ?? ''));
        $updates = [];

        if ($txnId !== '') {
            $updates['stripe_settlement_reference'] = $txnId;
            $updates['stripe_balance_transaction_id'] = $txnId;
        }

        $currentAt = $purchase->stripe_funds_available_at;
        $hadStripeTxn = trim((string) ($purchase->stripe_balance_transaction_id ?? '')) !== '';
        $shouldUpdateTime = $currentAt === null
            || ! $hadStripeTxn
            || ! $currentAt->equalTo($availableOn);

        if ($shouldUpdateTime) {
            $updates['stripe_funds_available_at'] = $availableOn;
        }

        if ($updates === []) {
            return false;
        }

        $purchase->update($updates);
        BelievePointBridgeReserveSettlementService::syncPurchaseReleaseSchedule($purchase->fresh());

        return true;
    }

    /**
     * Poll Stripe for the payment's balance transaction (missed webhooks / stale estimates).
     */
    public static function syncPurchaseFromStripeApi(BelievePointPurchase $purchase): bool
    {
        $payload = self::balanceTransactionPayloadForPurchase($purchase);
        if ($payload === null) {
            return false;
        }

        return self::syncPurchaseFromBalanceTransactionPayload($purchase, $payload);
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function balanceTransactionPayloadForPurchase(BelievePointPurchase $purchase): ?array
    {
        $paymentIntentId = trim((string) ($purchase->stripe_payment_intent_id ?? ''));
        if ($paymentIntentId !== '' && str_starts_with($paymentIntentId, 'pi_')) {
            return self::balanceTransactionPayloadForPaymentIntent($paymentIntentId);
        }

        $txnId = trim((string) ($purchase->stripe_balance_transaction_id ?? ''));
        if ($txnId === '') {
            $txnId = trim((string) ($purchase->stripe_settlement_reference ?? ''));
        }

        if ($txnId !== '' && str_starts_with($txnId, 'txn_')) {
            return self::balanceTransactionPayloadForId($txnId);
        }

        return null;
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function balanceTransactionPayloadForPaymentIntent(string $paymentIntentId): ?array
    {
        $paymentIntentId = trim($paymentIntentId);
        if ($paymentIntentId === '' || ! str_starts_with($paymentIntentId, 'pi_')) {
            return null;
        }

        try {
            $stripe = Cashier::stripe();
            $intent = $stripe->paymentIntents->retrieve($paymentIntentId, [
                'expand' => ['latest_charge.balance_transaction'],
            ]);

            $charge = $intent->latest_charge ?? null;
            if (is_string($charge)) {
                $charge = $stripe->charges->retrieve($charge, ['expand' => ['balance_transaction']]);
            }

            $balanceTransaction = is_object($charge) ? ($charge->balance_transaction ?? null) : null;
            if (is_string($balanceTransaction)) {
                return self::balanceTransactionPayloadForId($balanceTransaction);
            }

            if (is_object($balanceTransaction)) {
                return self->normalizeBalanceTransactionObject($balanceTransaction);
            }
        } catch (\Throwable $e) {
            Log::warning('Believe Points: could not read Stripe balance transaction for payment intent', [
                'payment_intent_id' => $paymentIntentId,
                'message' => $e->getMessage(),
            ]);
        }

        return null;
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function balanceTransactionPayloadForId(string $balanceTransactionId): ?array
    {
        $balanceTransactionId = trim($balanceTransactionId);
        if ($balanceTransactionId === '' || ! str_starts_with($balanceTransactionId, 'txn_')) {
            return null;
        }

        try {
            $balanceTransaction = Cashier::stripe()->balanceTransactions->retrieve($balanceTransactionId);

            return self::normalizeBalanceTransactionObject($balanceTransaction);
        } catch (\Throwable $e) {
            Log::warning('Believe Points: could not read Stripe balance transaction', [
                'balance_transaction_id' => $balanceTransactionId,
                'message' => $e->getMessage(),
            ]);
        }

        return null;
    }

    /**
     * @return array<string, mixed>
     */
    private static function normalizeBalanceTransactionObject(object $balanceTransaction): array
    {
        return [
            'id' => (string) ($balanceTransaction->id ?? ''),
            'available_on' => $balanceTransaction->available_on ?? null,
            'status' => (string) ($balanceTransaction->status ?? ''),
            'source' => (string) ($balanceTransaction->source ?? ''),
        ];
    }

    private static function availableOnFromPaymentIntent(?string $paymentIntentId): ?Carbon
    {
        $payload = self::balanceTransactionPayloadForPaymentIntent(trim((string) ($paymentIntentId ?? '')));
        if ($payload === null) {
            return null;
        }

        return self::parseAvailableOnFromBalanceTransactionPayload($payload);
    }
}
