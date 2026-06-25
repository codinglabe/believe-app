<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;

/**
 * Detect Stripe sandbox / test-mode object IDs stored in the ledger.
 *
 * @see https://docs.stripe.com/api/idempotent_requests — test IDs embed {@code _test_} (e.g. cs_test_…).
 */
final class StripeTestReference
{
    /** @var list<string> */
    private const TEST_PREFIXES = [
        'cs_test_',
        'pi_test_',
        'ch_test_',
        'in_test_',
        'sub_test_',
        'cus_test_',
        'seti_test_',
        'src_test_',
        'tmr_test_',
        'price_test_',
        'prod_test_',
        'WELCOME-cs_test_',
    ];

    /** @var list<string> */
    private const LOCAL_DEV_PREFIXES = [
        'local_wallet_',
        'local_wallet_plan_',
        'local_wallet_product_',
    ];

    public static function isTest(?string $value): bool
    {
        if ($value === null || $value === '') {
            return false;
        }

        foreach (self::LOCAL_DEV_PREFIXES as $prefix) {
            if (str_starts_with($value, $prefix)) {
                return true;
            }
        }

        foreach (self::TEST_PREFIXES as $prefix) {
            if (str_starts_with($value, $prefix)) {
                return true;
            }
        }

        return (bool) preg_match('/_(test)_/i', $value);
    }

    /**
     * Ledger rows created from Stripe test credentials (never kept, even for subscriptions).
     */
    public static function applyTransactionScope(Builder $query): Builder
    {
        return $query->where(function (Builder $scope) {
            foreach (self::TEST_PREFIXES as $prefix) {
                $scope->orWhere('transaction_id', 'like', $prefix.'%');
            }

            $scope->orWhere('transaction_id', 'like', 'local_wallet_%');

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
            foreach (self::TEST_PREFIXES as $prefix) {
                $scope->orWhere($column, 'like', $prefix.'%');
            }

            foreach (self::LOCAL_DEV_PREFIXES as $prefix) {
                $scope->orWhere($column, 'like', $prefix.'%');
            }
        });
    }
}
