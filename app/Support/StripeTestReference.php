<?php

namespace App\Support;

use App\Models\Transaction;
use Illuminate\Database\Eloquent\Builder;

/**
 * @deprecated Prefer {@see StripeReferenceMode} for live/test classification.
 */
final class StripeTestReference
{
    public static function isTest(?string $value): bool
    {
        return StripeReferenceMode::isConfidentlyTest($value);
    }

    /**
     * Ledger rows created from Stripe test credentials (never kept, even for subscriptions).
     */
    public static function applyTransactionScope(Builder $query): Builder
    {
        return $query->where(function (Builder $scope) {
            foreach ([
                'cs_test_',
                'pi_test_',
                'ch_test_',
                'in_test_',
                'sub_test_',
                'cus_test_',
                'WELCOME-cs_test_',
            ] as $prefix) {
                $scope->orWhere('transaction_id', 'like', $prefix.'%');
            }

            $scope->orWhere('transaction_id', 'like', 'local_wallet_%')
                ->orWhere('meta->stripe_livemode', false);

            foreach ([
                'stripe_session_id',
                'stripe_payment_intent',
                'stripe_payment_intent_id',
                'stripe_subscription_id',
                'payment_intent',
                'original_payment_intent',
            ] as $metaKey) {
                foreach (['cs_test_', 'pi_test_', 'sub_test_', 'in_test_', 'ch_test_'] as $prefix) {
                    $scope->orWhere('meta->'.$metaKey, 'like', $prefix.'%');
                }
            }

            $scope->orWhere('meta->stripe_session_id', 'like', 'WELCOME-cs_test_%');
        });
    }

    public static function applyColumnScope(Builder $query, string $column): Builder
    {
        return $query->where(function (Builder $scope) use ($column) {
            foreach (['cs_test_', 'pi_test_', 'ch_test_', 'in_test_', 'sub_test_', 'cus_test_', 'WELCOME-cs_test_'] as $prefix) {
                $scope->orWhere($column, 'like', $prefix.'%');
            }

            foreach (['local_wallet_', 'local_wallet_plan_', 'local_wallet_product_'] as $prefix) {
                $scope->orWhere($column, 'like', $prefix.'%');
            }
        });
    }

    public static function isTestTransaction(Transaction $transaction): bool
    {
        return StripeReferenceMode::isConfidentlyTestTransaction($transaction);
    }
}
