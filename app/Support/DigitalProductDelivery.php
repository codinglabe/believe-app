<?php

namespace App\Support;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\MarketplaceProduct;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;

final class DigitalProductDelivery
{
    public const SHIPPING_RATE_ID = 'digital';

    public static function productIsDigital(?Product $product): bool
    {
        if (! $product || $product->isPrintifyProduct()) {
            return false;
        }

        return (string) ($product->type ?? '') === 'digital';
    }

    public static function marketplaceProductIsDigital(?MarketplaceProduct $mp): bool
    {
        return $mp && (string) $mp->product_type === 'digital';
    }

    public static function cartItemIsDigital(CartItem $item): bool
    {
        if ($item->marketplace_product_id && $item->marketplaceProduct) {
            return self::marketplaceProductIsDigital($item->marketplaceProduct);
        }

        if ($item->organization_product_id) {
            $mp = $item->organizationProduct?->marketplaceProduct;

            return self::marketplaceProductIsDigital($mp);
        }

        if ($item->product_id && $item->product) {
            return self::productIsDigital($item->product);
        }

        return false;
    }

    public static function orderItemIsDigital(OrderItem $item): bool
    {
        if ($item->marketplace_product_id && $item->marketplaceProduct) {
            return self::marketplaceProductIsDigital($item->marketplaceProduct);
        }

        if ($item->organization_product_id) {
            $mp = $item->organizationProduct?->marketplaceProduct;

            return self::marketplaceProductIsDigital($mp);
        }

        if ($item->product_id && $item->product) {
            return self::productIsDigital($item->product);
        }

        return false;
    }

    /**
     * Non-Printify lines that still need a shipping address / Shippo.
     */
    public static function cartItemNeedsShipping(CartItem $item): bool
    {
        if ($item->product_id && $item->product && ! empty($item->product->printify_product_id)) {
            return false;
        }

        return ! self::cartItemIsDigital($item);
    }

    public static function cartHasShippableNonPrintifyItems(?Cart $cart): bool
    {
        if (! $cart || $cart->items->isEmpty()) {
            return false;
        }

        return $cart->items->contains(fn (CartItem $item) => self::cartItemNeedsShipping($item));
    }

    /**
     * Cart has only digital (non-Printify) lines — no Printify, no physical manual/pool.
     */
    public static function cartIsDigitalOnly(?Cart $cart): bool
    {
        if (! $cart || $cart->items->isEmpty()) {
            return false;
        }

        $hasDigital = false;
        foreach ($cart->items as $item) {
            if ($item->product_id && $item->product && ! empty($item->product->printify_product_id)) {
                return false;
            }
            if (self::cartItemNeedsShipping($item)) {
                return false;
            }
            if (self::cartItemIsDigital($item)) {
                $hasDigital = true;
            }
        }

        return $hasDigital;
    }

    /** Cart includes at least one non-Printify digital line (may also include Printify). */
    public static function cartHasDigitalItems(?Cart $cart): bool
    {
        if (! $cart || $cart->items->isEmpty()) {
            return false;
        }

        return $cart->items->contains(fn (CartItem $item) => self::cartItemIsDigital($item));
    }

    public static function orderIsDigitalOnly(Order $order): bool
    {
        $order->loadMissing(['items.product', 'items.marketplaceProduct', 'items.organizationProduct.marketplaceProduct']);

        if ($order->items->isEmpty() || ! empty($order->printify_order_id)) {
            return false;
        }

        $hasDigital = false;
        foreach ($order->items as $item) {
            if (! self::orderItemIsDigital($item)) {
                return false;
            }
            $hasDigital = true;
        }

        return $hasDigital;
    }

    public static function allowedUploadMimes(): array
    {
        return [
            'pdf', 'epub', 'mobi', 'doc', 'docx', 'txt', 'rtf',
            'zip', 'xls', 'xlsx', 'ppt', 'pptx', 'csv', 'mp3', 'mp4',
        ];
    }

    public static function maxUploadKilobytes(): int
    {
        return (int) config('services.digital_products.max_upload_kb', 51200);
    }
}
