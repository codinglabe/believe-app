<?php

namespace App\Support;

use App\Models\BelievePointPurchase;
use App\Models\Transaction;
use Illuminate\Support\Facades\Schema;

final class LiveBelievePointPurchaseScope
{
    /**
     * Keep Stripe-backed BP purchases unless we can confidently identify test mode.
     */
    public static function isLivePurchase(BelievePointPurchase $purchase): bool
    {
        return self::isProtectedPurchase($purchase);
    }

    public static function isProtectedPurchase(BelievePointPurchase $purchase): bool
    {
        if (self::isConfidentlyTestPurchase($purchase)) {
            return false;
        }

        return trim((string) ($purchase->stripe_session_id ?? '')) !== ''
            || trim((string) ($purchase->stripe_payment_intent_id ?? '')) !== '';
    }

    public static function isLivePurchaseId(?int $purchaseId): bool
    {
        if (! $purchaseId) {
            return false;
        }

        $purchase = BelievePointPurchase::query()->find($purchaseId);

        return $purchase !== null && self::isProtectedPurchase($purchase);
    }

    /**
     * Keep admin-ledger BP rows unless Stripe test mode is confirmed.
     */
    public static function isLiveLedgerTransaction(Transaction $transaction): bool
    {
        return self::isProtectedBelievePointsLedgerTransaction($transaction);
    }

    public static function isProtectedBelievePointsLedgerTransaction(Transaction $transaction): bool
    {
        if (! self::isBelievePointsLedgerTransaction($transaction)) {
            return false;
        }

        return ! StripeReferenceMode::isConfidentlyTestTransaction($transaction, true);
    }

    public static function isBelievePointsLedgerTransaction(Transaction $transaction): bool
    {
        $meta = is_array($transaction->meta) ? $transaction->meta : [];
        $relatedType = ltrim((string) ($transaction->related_type ?? ''), '\\');

        return ($meta['source'] ?? '') === 'believe_points_purchase'
            || ($meta['source'] ?? '') === 'believe_points_purchase_refund'
            || $relatedType === BelievePointPurchase::class
            || str_ends_with($relatedType, 'BelievePointPurchase');
    }

    public static function userHasLivePurchase(int $userId): bool
    {
        if (! Schema::hasTable('believe_point_purchases')) {
            return false;
        }

        return BelievePointPurchase::query()
            ->where('user_id', $userId)
            ->whereIn('status', ['completed', 'pending', 'processing'])
            ->orderByDesc('id')
            ->get()
            ->contains(fn (BelievePointPurchase $purchase) => self::isProtectedPurchase($purchase));
    }

    private static function isConfidentlyTestPurchase(BelievePointPurchase $purchase): bool
    {
        if (StripeReferenceMode::isConfidentlyTest($purchase->stripe_session_id)) {
            return true;
        }

        if (StripeReferenceMode::isConfidentlyTest($purchase->stripe_payment_intent_id)) {
            return true;
        }

        $livemode = StripeReferenceMode::resolveLivemode($purchase->stripe_payment_intent_id)
            ?? StripeReferenceMode::resolveLivemode($purchase->stripe_session_id);

        return $livemode === false;
    }
}
