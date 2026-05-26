<?php

namespace App\Support;

use App\Models\Plan;
use Laravel\Cashier\Cashier;

/**
 * USD plan prices → Stripe integer cents without float truncation (19.90 → 1990, not 1989).
 */
final class PlanStripeAmount
{
    public static function usdToStripeCents(float|string|null $usd): int
    {
        if ($usd === null || $usd === '') {
            return 0;
        }

        return (int) round(round((float) $usd, 2) * 100);
    }

    public static function stripeIntervalFromFrequency(string $frequency): string
    {
        return match ($frequency) {
            'yearly', 'annually' => 'year',
            'weekly' => 'week',
            'daily' => 'day',
            default => 'month',
        };
    }

    /**
     * Stripe Price IDs are immutable — if the linked price cents are wrong (e.g. $19.89), create a new price.
     */
    public static function resolveCheckoutPriceId(Plan $plan): string
    {
        if ($plan->frequency === 'one-time') {
            throw new \InvalidArgumentException('Plan is one-time; use checkoutCharge instead of subscription price.');
        }

        $stripe = Cashier::stripe();
        $expectedCents = self::usdToStripeCents($plan->price);
        $interval = self::stripeIntervalFromFrequency($plan->frequency ?? 'monthly');

        if ($plan->stripe_price_id) {
            try {
                $existing = $stripe->prices->retrieve($plan->stripe_price_id);
                if (
                    $existing->active
                    && (int) $existing->unit_amount === $expectedCents
                    && $existing->recurring
                    && ($existing->recurring->interval ?? null) === $interval
                ) {
                    return $plan->stripe_price_id;
                }
            } catch (\Throwable) {
                // Create a replacement price below.
            }
        }

        $productId = $plan->stripe_product_id;
        if (! $productId) {
            $product = $stripe->products->create([
                'name' => $plan->name,
                'metadata' => [
                    'plan_id' => (string) $plan->id,
                ],
            ]);
            $productId = $product->id;
        }

        $price = $stripe->prices->create([
            'product' => $productId,
            'unit_amount' => $expectedCents,
            'currency' => 'usd',
            'recurring' => [
                'interval' => $interval,
            ],
            'metadata' => [
                'plan_id' => (string) $plan->id,
            ],
        ]);

        $plan->update([
            'stripe_product_id' => $productId,
            'stripe_price_id' => $price->id,
        ]);

        return $price->id;
    }
}
