<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Log;
use Laravel\Cashier\Cashier;

/**
 * Ensures a PaymentMethod is attached to the User's Cashier Stripe customer.
 * Fixes mismatches when the DB customer id and PM owner diverge (e.g. customer recreated, stale pm_*).
 */
class BelievePointsPaymentMethodSyncService
{
    public static function ensurePaymentMethodBelongsToCustomer(User $user, string $paymentMethodId): void
    {
        $user->createOrGetStripeCustomer();
        $user->refresh();

        $stripe = Cashier::stripe();
        $customerId = (string) $user->stripe_id;
        if ($customerId === '') {
            throw new \RuntimeException('User has no Stripe customer id after createOrGetStripeCustomer.');
        }

        $pm = $stripe->paymentMethods->retrieve($paymentMethodId);
        $pmCustomerId = self::normalizeStripeCustomerId($pm->customer);

        if ($pmCustomerId === $customerId) {
            return;
        }

        if ($pmCustomerId !== '') {
            try {
                $stripe->paymentMethods->detach($paymentMethodId);
            } catch (\Throwable $e) {
                Log::warning('Believe Points: could not detach payment method before attach', [
                    'user_id' => $user->id,
                    'payment_method' => $paymentMethodId,
                    'pm_customer' => $pmCustomerId,
                    'target_customer' => $customerId,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $stripe->paymentMethods->attach($paymentMethodId, ['customer' => $customerId]);
    }

    private static function normalizeStripeCustomerId(mixed $customer): string
    {
        if ($customer === null) {
            return '';
        }
        if (is_string($customer)) {
            return $customer;
        }
        if (is_object($customer) && isset($customer->id)) {
            return (string) $customer->id;
        }

        return '';
    }
}
