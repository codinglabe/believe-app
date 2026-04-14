<?php

namespace App\Services;

use App\Models\Cart;
use App\Models\MarketplaceProduct;
use App\Models\TempOrder;
use Illuminate\Support\Facades\Log;
use Stripe\Stripe;
use Stripe\Tax\Calculation;

/**
 * Stripe Tax for custom flows (PaymentIntent + Elements). Uses the Tax Calculation API.
 * Checkout Sessions should set {@see \App\Support\StripeAutomaticTax::checkoutSessionOptions()} instead.
 */
final class StripeTaxCalculationService
{
    public static function enabled(): bool
    {
        return (bool) config('services.stripe.automatic_tax', false);
    }

    /**
     * @param  callable(MarketplaceProduct|null): bool  $isDigitalOnlyMp
     * @return array{
     *     tax_usd: float,
     *     amount_total_usd: float,
     *     calculation_id: string|null,
     *     tax_breakdown: array<int, array<string, mixed>>
     * }|null
     */
    public static function calculateForMarketplace(
        TempOrder $tempOrder,
        Cart $cart,
        float $shippingUsd,
        callable $isDigitalOnlyMp,
    ): ?array {
        if (! self::enabled()) {
            return null;
        }

        self::configureStripeKey();

        $cart->loadMissing([
            'items.product',
            'items.marketplaceProduct',
            'items.organizationProduct.marketplaceProduct',
        ]);

        $lineItems = [];
        foreach ($cart->items as $item) {
            $amountCents = (int) round((float) $item->unit_price * (int) $item->quantity * 100);
            if ($amountCents <= 0) {
                continue;
            }

            $mp = $item->marketplaceProduct
                ?? $item->organizationProduct?->marketplaceProduct
                ?? null;
            $digital = $mp !== null && $isDigitalOnlyMp($mp);
            $taxCode = $digital
                ? (string) config('services.stripe.tax_code_digital', 'txcd_10000000')
                : (string) config('services.stripe.tax_code_physical', 'txcd_99999999');

            $lineItems[] = [
                'amount' => $amountCents,
                'reference' => 'cart_item_'.$item->id,
                'tax_behavior' => 'exclusive',
                'tax_code' => $taxCode,
            ];
        }

        if ($lineItems === []) {
            return null;
        }

        $country = self::normalizeCountry((string) ($tempOrder->country ?? 'US'));
        $state = self::normalizeRegion((string) ($tempOrder->state ?? ''));

        $customerDetails = [
            'address' => array_filter([
                'line1' => self::truncate((string) ($tempOrder->shipping_address ?? ''), 500),
                'city' => self::truncate((string) ($tempOrder->city ?? ''), 100),
                'state' => $country === 'US' ? $state : self::truncate($state, 100),
                'postal_code' => self::truncate((string) ($tempOrder->zip ?? ''), 20),
                'country' => $country,
            ]),
            'address_source' => 'shipping',
        ];

        $params = [
            'currency' => 'usd',
            'line_items' => $lineItems,
            'customer_details' => $customerDetails,
        ];

        $shippingCents = (int) round(max(0.0, $shippingUsd) * 100);
        if ($shippingCents > 0) {
            $params['shipping_cost'] = [
                'amount' => $shippingCents,
                'tax_behavior' => 'exclusive',
                'tax_code' => (string) config('services.stripe.tax_code_shipping', 'txcd_92010001'),
            ];
        }

        try {
            /** @var Calculation $calc */
            $calc = Calculation::create($params);
        } catch (\Throwable $e) {
            Log::warning('Stripe Tax Calculation failed (marketplace)', [
                'temp_order_id' => $tempOrder->id,
                'message' => $e->getMessage(),
            ]);

            return null;
        }

        $taxCents = (int) ($calc->tax_amount_exclusive ?? 0);
        $totalCents = (int) ($calc->amount_total ?? 0);

        $breakdown = [];
        foreach ($calc->tax_breakdown ?? [] as $row) {
            if (is_object($row)) {
                $breakdown[] = $row->toArray();
            } elseif (is_array($row)) {
                $breakdown[] = $row;
            }
        }

        return [
            'tax_usd' => round($taxCents / 100, 2),
            'amount_total_usd' => round($totalCents / 100, 2),
            'calculation_id' => is_string($calc->id ?? null) ? $calc->id : null,
            'tax_breakdown' => $breakdown,
        ];
    }

    public static function configureStripeKey(): void
    {
        $env = StripeConfigService::getEnvironment();
        $credentials = StripeConfigService::getCredentials($env);
        $secret = $credentials['secret_key'] ?? config('cashier.secret') ?? config('services.stripe.secret');
        if (is_string($secret) && $secret !== '') {
            Stripe::setApiKey($secret);
        }
    }

    private static function normalizeCountry(string $country): string
    {
        $c = trim($country);
        if (strlen($c) === 2) {
            return strtoupper($c);
        }
        $map = [
            'united states' => 'US',
            'usa' => 'US',
            'u.s.' => 'US',
            'u.s.a.' => 'US',
            'canada' => 'CA',
            'united kingdom' => 'GB',
        ];
        $lower = strtolower($c);

        return $map[$lower] ?? (strlen($c) >= 2 ? strtoupper(substr($c, 0, 2)) : 'US');
    }

    private static function normalizeRegion(string $state): string
    {
        $clean = preg_replace('/[^A-Za-z0-9]/', '', $state) ?? '';

        return strtoupper(substr($clean, 0, 32));
    }

    private static function truncate(string $value, int $max): string
    {
        if ($max <= 0) {
            return '';
        }
        if (strlen($value) <= $max) {
            return $value;
        }

        return substr($value, 0, $max);
    }
}
