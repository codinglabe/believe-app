<?php

namespace App\Services;

use App\Models\AdminSetting;
use App\Models\User;
use App\Support\SupporterSubscriptionService;

/**
 * Admin-configurable settings for the Add Believe Points purchase flow only.
 */
final class BelievePointsPurchaseSettingsService
{
    public const KEY_BRP_VALUE = 'bp_purchase_brp_value';

    public const KEY_PLATFORM_FEE_PERCENT = 'bp_purchase_platform_fee_percent';

    public const KEY_PROCESSING_FEE_PERCENT = 'bp_purchase_processing_fee_percent';

    public const KEY_FREE_BRP_AWARD = 'bp_purchase_free_brp_award';

    public const KEY_PRIME_BRP_AWARD = 'bp_purchase_prime_brp_award';

    public const KEY_CARD_HOLD_HOURS = 'bp_purchase_card_hold_hours';

    public const DEFAULT_BRP_VALUE = 0.005;

    public const DEFAULT_PLATFORM_FEE_PERCENT = 1.0;

    public const DEFAULT_PROCESSING_FEE_PERCENT = 1.0;

    public const DEFAULT_FREE_BRP_AWARD = 5.0;

    public const DEFAULT_PRIME_BRP_AWARD = 10.0;

    public const DEFAULT_CARD_HOLD_HOURS = 24;

    public static function brpValue(): float
    {
        return max(0, (float) AdminSetting::get(self::KEY_BRP_VALUE, self::DEFAULT_BRP_VALUE));
    }

    public static function platformFeePercent(): float
    {
        return max(0, (float) AdminSetting::get(self::KEY_PLATFORM_FEE_PERCENT, self::DEFAULT_PLATFORM_FEE_PERCENT));
    }

    public static function processingFeePercent(): float
    {
        return max(0, (float) AdminSetting::get(self::KEY_PROCESSING_FEE_PERCENT, self::DEFAULT_PROCESSING_FEE_PERCENT));
    }

    public static function freeBrpAward(): float
    {
        return max(0, (float) AdminSetting::get(self::KEY_FREE_BRP_AWARD, self::DEFAULT_FREE_BRP_AWARD));
    }

    public static function primeBrpAward(): float
    {
        return max(0, (float) AdminSetting::get(self::KEY_PRIME_BRP_AWARD, self::DEFAULT_PRIME_BRP_AWARD));
    }

    /**
     * Flat Believe Reward Points awarded for a single Believe Points purchase,
     * based on the buyer's supporter membership tier (not the purchase amount).
     */
    public static function brpAwardForUser(?User $user): float
    {
        if ($user === null) {
            return self::freeBrpAward();
        }

        return SupporterSubscriptionService::currentTierSlug($user) === SupporterSubscriptionService::SLUG_PRIME
            ? self::primeBrpAward()
            : self::freeBrpAward();
    }

    public static function cardHoldHours(): int
    {
        return max(0, (int) AdminSetting::get(self::KEY_CARD_HOLD_HOURS, self::DEFAULT_CARD_HOLD_HOURS));
    }

    /**
     * @return array{
     *     brp_value: float,
     *     platform_fee_percent: float,
     *     processing_fee_percent: float,
     *     free_brp_award: float,
     *     prime_brp_award: float,
     *     brp_award: float,
     *     card_hold_hours: int
     * }
     */
    public static function frontendPayload(?User $user = null): array
    {
        return [
            'brp_value' => self::brpValue(),
            'platform_fee_percent' => self::platformFeePercent(),
            'processing_fee_percent' => self::processingFeePercent(),
            'free_brp_award' => self::freeBrpAward(),
            'prime_brp_award' => self::primeBrpAward(),
            'brp_award' => self::brpAwardForUser($user),
            'card_hold_hours' => self::cardHoldHours(),
        ];
    }

    /**
     * @return array{
     *     brp_value: float,
     *     platform_fee_percent: float,
     *     processing_fee_percent: float,
     *     free_brp_award: float,
     *     prime_brp_award: float,
     *     brp_award: float,
     *     card_hold_hours: int
     * }
     */
    public static function adminPayload(): array
    {
        return self::frontendPayload();
    }
}
