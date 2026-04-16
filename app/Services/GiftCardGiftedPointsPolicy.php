<?php

namespace App\Services;

/**
 * Gifted Believe Points may only be redeemed on closed-loop retail cards.
 * Open-loop network cards (Visa, Mastercard) must be paid with purchased Believe Points only.
 */
class GiftCardGiftedPointsPolicy
{
    public static function isAllowedForGiftedRedemption(?string $productDisplayName): bool
    {
        if ($productDisplayName === null || trim($productDisplayName) === '') {
            return false;
        }

        $n = mb_strtolower($productDisplayName);

        if (preg_match('/\bvisa\b/u', $n)) {
            return false;
        }

        if (preg_match('/\bmastercard\b/u', $n)) {
            return false;
        }

        if (preg_match('/\bmaster card\b/u', $n)) {
            return false;
        }

        return true;
    }
}
