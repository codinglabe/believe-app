<?php

namespace App\Support;

use App\Models\Plan;
use Illuminate\Support\Facades\Log;
use Laravel\Cashier\Cashier;

/**
 * Unity Membership introductory pricing: intro rate for N months, then standard rate (Stripe schedule).
 */
final class PlanIntroductorySubscription
{
    public static function introPeriodMonths(Plan $plan): int
    {
        $fromField = self::customFieldValue($plan, 'pricing_intro_period_months');
        if ($fromField !== null && $fromField !== '') {
            $months = (int) preg_replace('/\D/', '', $fromField);
            if ($months > 0) {
                return $months;
            }
        }

        return max(1, (int) config('services.plan_subscription.intro_period_months', PlanPricingPageDefaults::INTRO_PERIOD_MONTHS));
    }

    public static function standardPriceUsd(Plan $plan): ?float
    {
        $raw = self::customFieldValue($plan, 'pricing_standard_price');
        if ($raw !== null && $raw !== '') {
            $amount = (float) preg_replace('/[^0-9.]/', '', $raw);

            return $amount > 0 ? round($amount, 2) : null;
        }

        return PlanPricingPageDefaults::STANDARD_PRICE;
    }

    public static function hasIntroductoryPricing(Plan $plan): bool
    {
        if ($plan->frequency === 'one-time') {
            return false;
        }

        $standard = self::standardPriceUsd($plan);
        $intro = round((float) $plan->price, 2);

        return $standard !== null && $standard > $intro;
    }

    public static function resolveStandardStripePriceId(Plan $plan): string
    {
        $standardUsd = self::standardPriceUsd($plan);
        if ($standardUsd === null) {
            throw new \InvalidArgumentException('No standard price configured for plan.');
        }

        $expectedCents = PlanStripeAmount::usdToStripeCents($standardUsd);
        $interval = PlanStripeAmount::stripeIntervalFromFrequency($plan->frequency ?? 'monthly');

        $cached = self::customFieldValue($plan, 'pricing_standard_stripe_price_id');
        if ($cached) {
            try {
                $existing = Cashier::stripe()->prices->retrieve($cached);
                if (
                    $existing->active
                    && (int) $existing->unit_amount === $expectedCents
                    && $existing->recurring
                    && ($existing->recurring->interval ?? null) === $interval
                ) {
                    return $cached;
                }
            } catch (\Throwable) {
                // Create a replacement price below.
            }
        }

        $productId = $plan->stripe_product_id;
        if (! $productId) {
            PlanStripeAmount::resolveCheckoutPriceId($plan->fresh());
            $plan->refresh();
            $productId = $plan->stripe_product_id;
        }

        if (! $productId) {
            throw new \RuntimeException('Unable to resolve Stripe product for plan standard price.');
        }

        $price = Cashier::stripe()->prices->create([
            'product' => $productId,
            'unit_amount' => $expectedCents,
            'currency' => 'usd',
            'recurring' => [
                'interval' => $interval,
            ],
            'metadata' => [
                'plan_id' => (string) $plan->id,
                'price_tier' => 'standard',
            ],
        ]);

        self::upsertCustomField($plan, 'pricing_standard_stripe_price_id', $price->id);

        return $price->id;
    }

    public static function attachScheduleIfNeeded(Plan $plan, string $stripeSubscriptionId): void
    {
        if (! self::hasIntroductoryPricing($plan)) {
            return;
        }

        try {
            $stripe = Cashier::stripe();
            $subscription = $stripe->subscriptions->retrieve($stripeSubscriptionId);

            if (! empty($subscription->schedule)) {
                return;
            }

            $introPriceId = PlanStripeAmount::resolveCheckoutPriceId($plan->fresh());
            $standardPriceId = self::resolveStandardStripePriceId($plan->fresh());
            $months = self::introPeriodMonths($plan);

            $schedule = $stripe->subscriptionSchedules->create([
                'from_subscription' => $stripeSubscriptionId,
            ]);

            $phaseStart = $schedule->phases[0]->start_date ?? time();

            $stripe->subscriptionSchedules->update($schedule->id, [
                'end_behavior' => 'release',
                'phases' => [
                    [
                        'items' => [
                            ['price' => $introPriceId, 'quantity' => 1],
                        ],
                        'iterations' => $months,
                        'start_date' => $phaseStart,
                        'proration_behavior' => 'none',
                    ],
                    [
                        'items' => [
                            ['price' => $standardPriceId, 'quantity' => 1],
                        ],
                        'proration_behavior' => 'none',
                    ],
                ],
            ]);

            Log::info('Introductory subscription schedule attached', [
                'plan_id' => $plan->id,
                'stripe_subscription_id' => $stripeSubscriptionId,
                'schedule_id' => $schedule->id,
                'intro_period_months' => $months,
                'intro_price_id' => $introPriceId,
                'standard_price_id' => $standardPriceId,
            ]);
        } catch (\Throwable $e) {
            Log::error('Failed to attach introductory subscription schedule', [
                'plan_id' => $plan->id,
                'stripe_subscription_id' => $stripeSubscriptionId,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /** @return array{intro_period_months: int, standard_price: float|null, intro_ends_at: string|null} */
    public static function subscriptionDetailsForUser(Plan $plan): array
    {
        $months = self::introPeriodMonths($plan);
        $standard = self::standardPriceUsd($plan);

        return [
            'intro_period_months' => $months,
            'standard_price' => $standard,
            'intro_ends_at' => self::hasIntroductoryPricing($plan)
                ? now()->addMonths($months)->toIso8601String()
                : null,
        ];
    }

    private static function customFieldValue(Plan $plan, string $key): ?string
    {
        $want = strtolower($key);
        $fields = is_array($plan->custom_fields) ? $plan->custom_fields : [];

        foreach ($fields as $field) {
            if (strtolower((string) ($field['key'] ?? '')) === $want) {
                $value = trim((string) ($field['value'] ?? ''));

                return $value !== '' ? $value : null;
            }
        }

        return null;
    }

    private static function upsertCustomField(Plan $plan, string $key, string $value): void
    {
        $fields = is_array($plan->custom_fields) ? $plan->custom_fields : [];
        $found = false;

        foreach ($fields as &$field) {
            if (($field['key'] ?? '') === $key) {
                $field['value'] = $value;
                $found = true;
                break;
            }
        }
        unset($field);

        if (! $found) {
            $fields[] = [
                'key' => $key,
                'label' => 'Pricing Standard Stripe Price Id',
                'value' => $value,
                'type' => 'text',
                'icon' => '',
                'description' => null,
            ];
        }

        $plan->update(['custom_fields' => $fields]);
    }
}
