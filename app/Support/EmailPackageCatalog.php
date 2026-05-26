<?php

namespace App\Support;

use App\Models\EmailPackage;

final class EmailPackageCatalog
{
    /**
     * @return array<int, array{id: int, name: string, description: string|null, emails_count: int, price: float, purchasable: bool}>
     */
    public static function activeForCheckout(): array
    {
        return EmailPackage::active()->ordered()->get()->map(static function ($package) {
            $price = (float) $package->price;

            return [
                'id' => $package->id,
                'name' => $package->name,
                'description' => $package->description,
                'emails_count' => $package->emails_count,
                'price' => $price,
                'purchasable' => StripeCustomerChargeAmount::meetsCheckoutMinimum($price),
            ];
        })->values()->all();
    }

    public static function stripeMinCheckoutUsd(): float
    {
        return StripeCustomerChargeAmount::MIN_CHECKOUT_CENTS / 100;
    }
}
