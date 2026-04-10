<?php

namespace App\Services;

use App\Models\Cart;
use App\Models\MarketplaceProduct;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;

/**
 * Sum of organization-attributed "profit / markup" USD used as the BIU platform-fee base on marketplace checkout.
 *
 * Buyer total is unchanged; the fee is ledger-side and is taken from this pool (not from full subtotal when markup &lt; subtotal).
 */
final class MarketplaceOrganizationMarkupService
{
    public static function basisFromCart(Cart $cart, PrintifyService $printify): float
    {
        $cart->loadMissing([
            'items.product',
            'items.marketplaceProduct',
            'items.organizationProduct.marketplaceProduct',
        ]);

        $productCache = [];
        $sum = 0.0;
        foreach ($cart->items as $item) {
            $sum += self::lineMarkupUsdFromCartItem($item, $printify, $productCache);
        }

        return round(max(0.0, $sum), 2);
    }

    public static function basisFromOrder(Order $order, PrintifyService $printify): float
    {
        $order->loadMissing([
            'items.product',
            'items.marketplaceProduct',
            'items.organizationProduct.marketplaceProduct',
        ]);

        $productCache = [];
        $sum = 0.0;
        foreach ($order->items as $item) {
            $sum += self::lineMarkupUsdFromOrderItem($item, $printify, $productCache);
        }

        return round(max(0.0, $sum), 2);
    }

    /**
     * Platform-fee base: organization markup if &gt; 0, otherwise full subtotal (merchant-only / legacy).
     */
    public static function platformFeeBaseUsd(float $subtotal, float $organizationMarkupBasis): float
    {
        if ($organizationMarkupBasis > 0.0001) {
            return $organizationMarkupBasis;
        }

        return max(0.0, $subtotal);
    }

    private static function nonprofitOrgSliceUsd(float $lineSubtotal, ?MarketplaceProduct $mp): float
    {
        if (! $mp) {
            return 0.0;
        }
        $pctM = (float) ($mp->pct_merchant ?? 0);
        $pctN = (float) ($mp->pct_nonprofit ?? 0);
        if (! $mp->nonprofit_marketplace_enabled || abs($pctM + $pctN) <= 0.01) {
            return 0.0;
        }

        return round($lineSubtotal * $pctN / 100, 2);
    }

    private static function printifyLineMarkupUsd(float $lineSubtotal, int $qty, Product $product, int $variantId, PrintifyService $printify, array &$productCache): float
    {
        $pid = (string) $product->printify_product_id;
        if ($pid === '') {
            return 0.0;
        }
        if (! isset($productCache[$pid])) {
            try {
                $productCache[$pid] = $printify->getProduct($pid);
            } catch (\Throwable) {
                $productCache[$pid] = [];
            }
        }
        $details = $productCache[$pid];
        $costCents = 0;
        foreach ($details['variants'] ?? [] as $v) {
            if ((int) ($v['id'] ?? 0) === $variantId) {
                $costCents = (int) ($v['cost'] ?? 0);
                break;
            }
        }
        $costUsd = ($costCents / 100) * $qty;
        $retail = $lineSubtotal;

        return round(max(0.0, $retail - $costUsd), 2);
    }

    private static function manualOrgProductMarkupUsd(float $lineSubtotal, Product $product, int $qty): float
    {
        $sc = $product->source_cost;
        if ($sc !== null && $sc !== '' && (float) $sc > 0) {
            $cost = (float) $sc * $qty;

            return round(max(0.0, $lineSubtotal - $cost), 2);
        }
        $p = (float) ($product->profit_margin_percentage ?? 0);
        if ($p > 0) {
            // Selling price = cost * (1 + p/100) ⇒ markup = subtotal * p/(100+p)
            return round($lineSubtotal * ($p / (100 + $p)), 2);
        }

        return 0.0;
    }

    private static function lineMarkupUsdFromCartItem($item, PrintifyService $printify, array &$productCache): float
    {
        $lineSubtotal = (float) $item->unit_price * (int) $item->quantity;
        if ($lineSubtotal <= 0) {
            return 0.0;
        }

        if ($item->marketplace_product_id) {
            $item->loadMissing('marketplaceProduct');

            return self::nonprofitOrgSliceUsd($lineSubtotal, $item->marketplaceProduct);
        }

        if ($item->organization_product_id) {
            $item->loadMissing('organizationProduct.marketplaceProduct');
            $mp = $item->organizationProduct?->marketplaceProduct;

            return self::nonprofitOrgSliceUsd($lineSubtotal, $mp);
        }

        if ($item->product_id && $item->product) {
            $product = $item->product;
            $mp = null;
            if ($product->marketplace_product_id) {
                $mp = MarketplaceProduct::query()->find((int) $product->marketplace_product_id);
            }
            if ($mp) {
                $slice = self::nonprofitOrgSliceUsd($lineSubtotal, $mp);
                if ($slice > 0) {
                    return $slice;
                }
            }
            if (! empty($product->printify_product_id) && ! empty($item->printify_variant_id)) {
                return self::printifyLineMarkupUsd(
                    $lineSubtotal,
                    (int) $item->quantity,
                    $product,
                    (int) $item->printify_variant_id,
                    $printify,
                    $productCache
                );
            }

            return self::manualOrgProductMarkupUsd($lineSubtotal, $product, (int) $item->quantity);
        }

        return 0.0;
    }

    private static function lineMarkupUsdFromOrderItem(OrderItem $item, PrintifyService $printify, array &$productCache): float
    {
        $lineSubtotal = (float) $item->subtotal;
        if ($lineSubtotal <= 0) {
            return 0.0;
        }

        if ($item->marketplace_product_id) {
            $item->loadMissing('marketplaceProduct');

            return self::nonprofitOrgSliceUsd($lineSubtotal, $item->marketplaceProduct);
        }

        if ($item->organization_product_id) {
            $item->loadMissing('organizationProduct.marketplaceProduct');
            $mp = $item->organizationProduct?->marketplaceProduct;

            return self::nonprofitOrgSliceUsd($lineSubtotal, $mp);
        }

        if ($item->product_id) {
            $item->loadMissing('product');
            $product = $item->product;
            if (! $product) {
                return 0.0;
            }
            $mp = null;
            if ($product->marketplace_product_id) {
                $mp = MarketplaceProduct::query()->find((int) $product->marketplace_product_id);
            }
            if ($mp) {
                $slice = self::nonprofitOrgSliceUsd($lineSubtotal, $mp);
                if ($slice > 0) {
                    return $slice;
                }
            }
            $vid = (int) ($item->printify_variant_id ?? 0);
            if (! empty($product->printify_product_id) && $vid > 0) {
                return self::printifyLineMarkupUsd(
                    $lineSubtotal,
                    (int) $item->quantity,
                    $product,
                    $vid,
                    $printify,
                    $productCache
                );
            }

            return self::manualOrgProductMarkupUsd($lineSubtotal, $product, (int) $item->quantity);
        }

        return 0.0;
    }
}
