<?php

namespace App\Support;

/**
 * Merges Stripe Checkout session options with automatic tax flags from config.
 */
final class StripeAutomaticTax
{
    /**
     * @param  array<string, mixed>  $options
     * @return array<string, mixed>
     */
    public static function mergeCheckoutOptions(array $options): array
    {
        $enabled = (bool) config('services.stripe.automatic_tax', false);

        return array_merge($options, [
            'automatic_tax' => ['enabled' => $enabled],
        ]);
    }
}
