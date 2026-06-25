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

    private static function availableOnFromPaymentIntent(?string $paymentIntentId): ?Carbon
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
                $balanceTransaction = $stripe->balanceTransactions->retrieve($balanceTransaction);
            }

            $availableOn = is_object($balanceTransaction) ? ($balanceTransaction->available_on ?? null) : null;
            if ($availableOn !== null && is_numeric($availableOn)) {
                return Carbon::createFromTimestamp((int) $availableOn);
            }
        } catch (\Throwable $e) {
            Log::warning('Believe Points: could not read Stripe available_on', [
                'payment_intent_id' => $paymentIntentId,
                'message' => $e->getMessage(),
            ]);
        }

        return null;
    }
}
