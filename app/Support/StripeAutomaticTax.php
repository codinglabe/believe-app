<?php

namespace App\Support;

/**
 * Shared Stripe automatic_tax options for Laravel Cashier checkout sessions and raw Session::create.
 */
final class StripeAutomaticTax
{
    public static function enabled(): bool
    {
        return (bool) config('services.stripe.automatic_tax', false)
            || (bool) config('donations.stripe_automatic_tax', false);
    }

    /**
     * Merge automatic tax + customer address updates when enabled (Cashier {@see \Laravel\Cashier\Checkout}).
     *
     * @param  array<string, mixed>  $checkoutOptions
     * @return array<string, mixed>
     */
    public static function mergeCheckoutOptions(array $checkoutOptions): array
    {
        if (! self::enabled()) {
            return $checkoutOptions;
        }

        $checkoutOptions['automatic_tax'] = ['enabled' => true];
        $checkoutOptions['customer_update'] = array_merge(
            is_array($checkoutOptions['customer_update'] ?? null) ? $checkoutOptions['customer_update'] : [],
            ['address' => 'auto']
        );
        $checkoutOptions['billing_address_collection'] = $checkoutOptions['billing_address_collection'] ?? 'required';

        return $checkoutOptions;
    }

    /**
     * Same flags for {@see \Stripe\Checkout\Session::create()} payloads.
     *
     * @param  array<string, mixed>  $sessionParams
     * @return array<string, mixed>
     */
    public static function mergeCheckoutSessionParams(array $sessionParams): array
    {
        if (! self::enabled()) {
            return $sessionParams;
        }

        $sessionParams['automatic_tax'] = ['enabled' => true];
        $sessionParams['customer_update'] = array_merge(
            is_array($sessionParams['customer_update'] ?? null) ? $sessionParams['customer_update'] : [],
            ['address' => 'auto']
        );
        $sessionParams['billing_address_collection'] = $sessionParams['billing_address_collection'] ?? 'required';

        return $sessionParams;
    }
}
