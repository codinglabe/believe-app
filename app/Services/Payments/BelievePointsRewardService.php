<?php

namespace App\Services\Payments;

use App\Models\BelievePointsLedgerEntry;
use App\Models\Donation;
use App\Models\PaymentTransaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Idempotent +5 BRP (Believe Reward Points) on successful donation.
 */
class BelievePointsRewardService
{
    public static function issueDonationReward(Donation $donation): bool
    {
        if ($donation->status !== 'completed' && $donation->status !== 'active') {
            return false;
        }

        if ($donation->reward_points_issued) {
            return false;
        }

        return (bool) DB::transaction(function () use ($donation) {
            $donation = Donation::lockForUpdate()->find($donation->id);
            if (! $donation || $donation->reward_points_issued || ! $donation->user_id) {
                return false;
            }

            $paymentTx = $donation->payment_transaction_id
                ? PaymentTransaction::lockForUpdate()->find($donation->payment_transaction_id)
                : null;

            if ($paymentTx && $paymentTx->reward_issued) {
                $donation->update(['reward_points_issued' => true]);

                return false;
            }

            $user = User::lockForUpdate()->find($donation->user_id);
            if (! $user) {
                return false;
            }

            $points = PaymentTransaction::REWARD_POINTS_AMOUNT;
            $user->addRewardPoints(
                $points,
                'donation',
                $donation->id,
                'Reward for completed donation',
                [
                    'donation_id' => $donation->id,
                    'organization_id' => $donation->organization_id,
                    'payment_method' => $donation->payment_method,
                    'payment_transaction_id' => $paymentTx?->id,
                ]
            );

            $donation->update(['reward_points_issued' => true]);

            if ($paymentTx) {
                $paymentTx->update([
                    'reward_issued' => true,
                    'reward_points' => $points,
                ]);
            }

            Log::info('Donation BRP reward issued', [
                'donation_id' => $donation->id,
                'user_id' => $user->id,
                'points' => $points,
            ]);

            return true;
        });
    }

    public static function issuePurchaseReward(PaymentTransaction $paymentTransaction): bool
    {
        if ($paymentTransaction->status !== PaymentTransaction::STATUS_COMPLETED) {
            return false;
        }

        if ($paymentTransaction->reward_issued || ! $paymentTransaction->user_id) {
            return false;
        }

        return (bool) DB::transaction(function () use ($paymentTransaction) {
            $tx = PaymentTransaction::lockForUpdate()->find($paymentTransaction->id);
            if (! $tx || $tx->reward_issued || ! $tx->user_id) {
                return false;
            }

            $user = User::lockForUpdate()->find($tx->user_id);
            if (! $user) {
                return false;
            }

            $points = PaymentTransaction::REWARD_POINTS_AMOUNT;
            $user->addBelievePoints((float) $points);

            BelievePointsLedgerEntry::create([
                'user_id' => $user->id,
                'payment_transaction_id' => $tx->id,
                'amount' => $points,
                'entry_type' => BelievePointsLedgerEntry::TYPE_REWARD,
                'description' => 'Reward for Believe Points purchase',
                'metadata' => [
                    'payment_transaction_id' => $tx->id,
                    'payment_method' => $tx->payment_method,
                ],
            ]);

            $tx->update([
                'reward_issued' => true,
                'reward_points' => $points,
            ]);

            Log::info('Believe Points purchase reward issued', [
                'payment_transaction_id' => $tx->id,
                'user_id' => $user->id,
                'points' => $points,
            ]);

            return true;
        });
    }
}
