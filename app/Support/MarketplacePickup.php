<?php

namespace App\Support;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\MarketplaceProduct;
use App\Models\Merchant;
use App\Models\MerchantHubOffer;
use App\Models\Organization;
use App\Models\OrganizationProduct;
use App\Models\Product;

final class MarketplacePickup
{
    public const RATE_ID = 'pickup';

    public static function isShippoPurchasableRateId(?string $id): bool
    {
        if ($id === null || $id === '') {
            return false;
        }
        $id = (string) $id;

        return ! in_array($id, [self::RATE_ID, 'standard', 'digital'], true);
    }

    public static function marketplaceProductAllowsPickup(?MarketplaceProduct $mp): bool
    {
        if (! $mp || ! (bool) ($mp->pickup_available ?? false)) {
            return false;
        }

        return in_array((string) $mp->product_type, ['physical', 'service', 'media'], true);
    }

    /**
     * Pool / nonprofit listing: merchant SKU must allow pickup, and the organization listing must opt in
     * (organization_products.pickup_available). Checkout address is the nonprofit location.
     */
    public static function organizationProductAllowsPickup(?OrganizationProduct $op): bool
    {
        if (! $op) {
            return false;
        }
        $op->loadMissing('marketplaceProduct');

        if (! self::marketplaceProductAllowsPickup($op->marketplaceProduct)) {
            return false;
        }

        return (bool) ($op->pickup_available ?? false);
    }

    /**
     * Nonprofit “My Source” catalog product (products table): manual, tied to an organization, physical, pickup flag on product.
     */
    public static function organizationOwnedManualProductAllowsPickup(?Product $product): bool
    {
        if (! $product || $product->isPrintifyProduct()) {
            return false;
        }
        if (empty($product->organization_id)) {
            return false;
        }
        if ((string) ($product->type ?? '') !== 'physical') {
            return false;
        }

        return (bool) ($product->pickup_available ?? false);
    }

    public static function cartItemAllowsPickup(CartItem $item): bool
    {
        if ($item->marketplace_product_id && $item->marketplaceProduct) {
            return self::marketplaceProductAllowsPickup($item->marketplaceProduct);
        }

        if ($item->organization_product_id && $item->organizationProduct) {
            return self::organizationProductAllowsPickup($item->organizationProduct);
        }

        if ($item->product_id && $item->product) {
            return self::organizationOwnedManualProductAllowsPickup($item->product);
        }

        return false;
    }

    /**
     * Stable key so all eligible lines must share one pickup location.
     */
    public static function pickupFingerprintForCartItem(CartItem $item): ?string
    {
        if (! self::cartItemAllowsPickup($item)) {
            return null;
        }

        if ($item->organization_product_id) {
            $org = $item->organizationProduct?->organization;

            return $org ? self::organizationFingerprint($org) : null;
        }

        if ($item->product_id) {
            $item->product?->loadMissing('organization');
            $org = $item->product?->organization;

            return $org ? self::organizationFingerprint($org) : null;
        }

        $merchant = $item->marketplaceProduct?->merchant;

        return $merchant ? self::merchantFingerprint($merchant) : null;
    }

    public static function pickupAddressLinesForCartItem(CartItem $item): ?string
    {
        if (! self::cartItemAllowsPickup($item)) {
            return null;
        }

        if ($item->organization_product_id) {
            $org = $item->organizationProduct?->organization;

            return $org ? self::formatOrganizationAddress($org) : null;
        }

        if ($item->product_id) {
            $item->product?->loadMissing('organization');
            $org = $item->product?->organization;

            return $org ? self::formatOrganizationAddress($org) : null;
        }

        $merchant = $item->marketplaceProduct?->merchant;

        return $merchant ? self::formatMerchantAddress($merchant) : null;
    }

    /**
     * True when every non-Printify shippable cart line allows pickup and shares the same location.
     */
    public static function cartAllowsUnifiedPickup(Cart $cart): bool
    {
        $fps = [];
        foreach ($cart->items as $item) {
            if (! self::isShippableNonPrintifyMarketplaceLine($item)) {
                continue;
            }
            if (! self::cartItemAllowsPickup($item)) {
                return false;
            }
            $fp = self::pickupFingerprintForCartItem($item);
            if ($fp === null || $fp === '') {
                return false;
            }
            $fps[] = $fp;
        }

        if ($fps === []) {
            return false;
        }

        $unique = array_unique($fps);

        return count($unique) === 1;
    }

    public static function pickupAddressLinesForCart(Cart $cart): ?string
    {
        if (! self::cartAllowsUnifiedPickup($cart)) {
            return null;
        }
        foreach ($cart->items as $item) {
            if (self::isShippableNonPrintifyMarketplaceLine($item)) {
                return self::pickupAddressLinesForCartItem($item);
            }
        }

        return null;
    }

    public static function formatMerchantAddress(Merchant $merchant): string
    {
        $merchant->loadMissing('shippingAddresses');
        $addr = $merchant->shipFromAddressForRates();

        $cityState = trim(implode(', ', array_filter([$addr['city'] ?? null, $addr['state'] ?? null])));
        $cityLine = trim($cityState.' '.($addr['zip'] ?? ''));

        $lines = array_filter([
            $addr['name'] ?? null,
            trim(($addr['street1'] ?? '').' '.($addr['street2'] ?? '')),
            $cityLine !== '' ? $cityLine : null,
            $addr['country'] ?? null,
        ], fn ($v) => $v !== null && $v !== '');

        return implode("\n", $lines);
    }

    public static function formatOrganizationAddress(Organization $org): string
    {
        $cityState = trim(implode(', ', array_filter([$org->city ?? null, $org->state ?? null])));
        $cityLine = trim($cityState.' '.($org->zip ?? ''));

        $lines = array_filter([
            $org->name,
            $org->street,
            $cityLine !== '' ? $cityLine : null,
        ], fn ($v) => $v !== null && $v !== '');

        return implode("\n", $lines);
    }

    public static function pickupAddressForMerchantHubOffer(MerchantHubOffer $offer, ?Merchant $merchantModel): ?string
    {
        if (! $merchantModel) {
            return null;
        }

        return self::formatMerchantAddress($merchantModel);
    }

    private static function merchantFingerprint(Merchant $merchant): string
    {
        $merchant->loadMissing('shippingAddresses');
        $a = $merchant->shipFromAddressForRates();

        return sha1(json_encode([
            'm',
            strtolower(trim($a['street1'] ?? '')),
            strtolower(trim($a['city'] ?? '')),
            strtolower(trim($a['state'] ?? '')),
            strtolower(trim($a['zip'] ?? '')),
            strtolower(trim($a['country'] ?? '')),
        ]));
    }

    private static function organizationFingerprint(Organization $org): string
    {
        return sha1(json_encode([
            'o',
            (int) $org->id,
            strtolower(trim((string) ($org->street ?? ''))),
            strtolower(trim((string) ($org->city ?? ''))),
            strtolower(trim((string) ($org->state ?? ''))),
            strtolower(trim((string) ($org->zip ?? ''))),
        ]));
    }

    private static function isShippableNonPrintifyMarketplaceLine(CartItem $item): bool
    {
        if ($item->marketplace_product_id) {
            $mp = $item->marketplaceProduct;
            if (! $mp) {
                return false;
            }

            return ! ((string) $mp->product_type === 'digital');
        }

        if ($item->organization_product_id) {
            $mp = $item->organizationProduct?->marketplaceProduct;
            if (! $mp) {
                return false;
            }

            return ! ((string) $mp->product_type === 'digital');
        }

        if ($item->product_id) {
            $product = $item->product;
            if (! $product) {
                return false;
            }
            if ($product->isPrintifyProduct()) {
                return false;
            }

            return (string) $product->type !== 'digital';
        }

        return false;
    }
}
