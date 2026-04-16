<?php

namespace App\Services;

use App\Models\Order;
use App\Models\ServiceOrder;
use App\Models\Transaction;
use Illuminate\Support\Facades\Log;
use Stripe\PaymentIntent;

/**
 * When Stripe Checkout / PaymentIntents include our ledger row id in metadata, sync actual
 * fees and amounts from the PaymentIntent (via Cashier webhook — no jobs).
 *
 * Metadata (any one):
 * - ledger_transaction_id: preferred
 * - transaction_id: numeric only = {@see Transaction::$id} (used by newsletter Pro, enrollments, etc.)
 */
final class StripeLedgerTransactionWebhookSync
{
    public static function syncFromWebhookPayload(array $payload): void
    {
        $type = $payload['type'] ?? '';
        if ($type === 'checkout.session.completed') {
            self::syncFromCheckoutSession($payload['data']['object'] ?? []);

            return;
        }
        if ($type === 'payment_intent.succeeded') {
            self::syncFromPaymentIntentObject($payload['data']['object'] ?? []);
        }
    }

    private static function syncFromCheckoutSession(array $session): void
    {
        if (($session['payment_status'] ?? '') !== 'paid') {
            return;
        }
        $meta = self::normalizeMetadata($session['metadata'] ?? []);
        $piRef = $session['payment_intent'] ?? null;
        $piId = is_string($piRef) ? $piRef : (is_array($piRef) ? ($piRef['id'] ?? null) : null);
        if (! is_string($piId) || $piId === '') {
            return;
        }

        $tx = self::resolveTransactionFromMetadata($meta);
        if ($tx) {
            self::applyStripeFinancials(
                $tx,
                $piId,
                self::filteredMergeMeta([
                    'stripe_checkout_session_id' => $session['id'] ?? null,
                ])
            );
        }

        self::syncOrderStripeFeeFromPaymentIntent($piId);

        self::syncServiceOrderFromCheckoutSession($meta, $piId);
    }

    /**
     * @param  array<string, string>  $meta
     */
    private static function syncServiceOrderFromCheckoutSession(array $meta, string $paymentIntentId): void
    {
        if (($meta['type'] ?? '') !== 'service_order') {
            return;
        }
        $rawId = $meta['order_id'] ?? '';
        if ($rawId === '' || ! ctype_digit((string) $rawId)) {
            return;
        }

        $data = self::retrievePaymentIntentFinancials($paymentIntentId);
        $feeUsd = $data['stripe_fee_usd'] ?? 0.0;

        $patch = [
            'stripe_payment_intent_id' => $paymentIntentId,
            'transaction_fee' => round((float) $feeUsd, 2),
        ];

        ServiceOrder::query()->whereKey((int) $rawId)->update($patch);
    }

    private static function syncFromPaymentIntentObject(array $pi): void
    {
        $piId = $pi['id'] ?? null;
        if (! is_string($piId) || $piId === '') {
            return;
        }

        self::syncOrderStripeFeeFromPaymentIntent($piId);

        $meta = self::normalizeMetadata($pi['metadata'] ?? []);
        $tx = self::resolveTransactionFromMetadata($meta);
        if (! $tx) {
            return;
        }

        self::applyStripeFinancials($tx, $piId, []);
    }

    private static function syncOrderStripeFeeFromPaymentIntent(string $paymentIntentId): void
    {
        $orders = Order::query()
            ->where('stripe_payment_intent_id', $paymentIntentId)
            ->get();
        if ($orders->isEmpty()) {
            return;
        }

        $feeUsd = 0.0;
        try {
            $data = self::retrievePaymentIntentFinancials($paymentIntentId);
            if ($data !== null) {
                $feeUsd = $data['stripe_fee_usd'];
            }
        } catch (\Throwable) {
            return;
        }

        foreach ($orders as $order) {
            $order->update([
                'stripe_fee_amount' => round($feeUsd, 2),
            ]);
        }
    }

    /**
     * @param  array<string, mixed|null>  $meta
     * @return array<string, mixed>
     */
    private static function filteredMergeMeta(array $meta): array
    {
        return array_filter(
            $meta,
            static fn ($v) => $v !== null && $v !== ''
        );
    }

    /**
     * @param  array<string, mixed>  $metadata
     * @return array<string, string>
     */
    private static function normalizeMetadata(array $metadata): array
    {
        $out = [];
        foreach ($metadata as $k => $v) {
            if ($v === null) {
                continue;
            }
            $out[(string) $k] = is_scalar($v) ? (string) $v : '';
        }

        return $out;
    }

    /**
     * @param  array<string, string>  $meta
     */
    private static function resolveTransactionFromMetadata(array $meta): ?Transaction
    {
        $raw = $meta['ledger_transaction_id'] ?? $meta['transaction_id'] ?? null;
        if ($raw === null || $raw === '') {
            return null;
        }
        if (! ctype_digit($raw)) {
            return null;
        }
        $id = (int) $raw;
        if ($id <= 0) {
            return null;
        }

        return Transaction::query()->find($id);
    }

    /**
     * @param  array<string, mixed|null>  $mergeMeta
     */
    private static function applyStripeFinancials(Transaction $transaction, string $paymentIntentId, array $mergeMeta): void
    {
        $data = self::retrievePaymentIntentFinancials($paymentIntentId);
        if ($data === null) {
            return;
        }

        $transaction->refresh();
        $existingMeta = is_array($transaction->meta) ? $transaction->meta : [];

        $transaction->update([
            'fee' => $data['stripe_fee_usd'],
            'meta' => array_merge($existingMeta, $mergeMeta, [
                'stripe_fee' => $data['stripe_fee_usd'],
                'stripe_processing_fee' => $data['stripe_fee_usd'],
                'stripe_fee_amount' => $data['stripe_fee_usd'],
                'stripe_payment_intent' => $paymentIntentId,
                'stripe_amount_received_usd' => $data['amount_received_usd'],
                'stripe_net_usd' => $data['net_usd'],
                'stripe_gross_usd' => $data['gross_usd'],
                'stripe_balance_transaction_id' => $data['balance_transaction_id'],
                'stripe_fee_sync_source' => 'webhook',
                'stripe_fee_synced_at' => now()->toIso8601String(),
            ]),
        ]);
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
    private static function retrievePaymentIntentFinancials(string $paymentIntentId): ?array
    {
        try {
            $pi = PaymentIntent::retrieve($paymentIntentId, [
                'expand' => ['latest_charge.balance_transaction'],
            ]);
        } catch (\Throwable $e) {
            Log::debug('Stripe ledger webhook sync: PaymentIntent retrieve failed', [
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
