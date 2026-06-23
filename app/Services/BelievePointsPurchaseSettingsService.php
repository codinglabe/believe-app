<?php

namespace App\Services;

use App\Models\AdminSetting;

/**
 * Admin-configurable settings for the Add Believe Points purchase flow only.
 */
final class BelievePointsPurchaseSettingsService
{
    public const KEY_BRP_VALUE = 'bp_purchase_brp_value';

    public const KEY_PLATFORM_FEE_PERCENT = 'bp_purchase_platform_fee_percent';

    public const KEY_CARD_BRP_RATE = 'bp_purchase_card_brp_rate';

    public const KEY_ACH_BRP_RATE = 'bp_purchase_ach_brp_rate';

    public const KEY_CARD_HOLD_HOURS = 'bp_purchase_card_hold_hours';

    public const DEFAULT_BRP_VALUE = 0.005;

    public const DEFAULT_PLATFORM_FEE_PERCENT = 1.0;

    public const DEFAULT_CARD_BRP_RATE = 2.0;

    public const DEFAULT_ACH_BRP_RATE = 1.0;

    public const DEFAULT_CARD_HOLD_HOURS = 24;

    public static function brpValue(): float
    {
        return max(0, (float) AdminSetting::get(self::KEY_BRP_VALUE, self::DEFAULT_BRP_VALUE));
    }

    public static function platformFeePercent(): float
    {
        return max(0, (float) AdminSetting::get(self::KEY_PLATFORM_FEE_PERCENT, self::DEFAULT_PLATFORM_FEE_PERCENT));
    }

    public static function cardBrpRate(): float
    {
        return max(0, (float) AdminSetting::get(self::KEY_CARD_BRP_RATE, self::DEFAULT_CARD_BRP_RATE));
    }

    public static function achBrpRate(): float
    {
        return max(0, (float) AdminSetting::get(self::KEY_ACH_BRP_RATE, self::DEFAULT_ACH_BRP_RATE));
    }

    public static function cardHoldHours(): int
    {
        return max(0, (int) AdminSetting::get(self::KEY_CARD_HOLD_HOURS, self::DEFAULT_CARD_HOLD_HOURS));
    }

    /**
     * @return array{
     *     brp_value: float,
     *     platform_fee_percent: float,
     *     card_brp_rate: float,
     *     ach_brp_rate: float,
     *     card_hold_hours: int
     * }
     */
    public static function frontendPayload(): array
    {
        return [
            'brp_value' => self::brpValue(),
            'platform_fee_percent' => self::platformFeePercent(),
            'card_brp_rate' => self::cardBrpRate(),
            'ach_brp_rate' => self::achBrpRate(),
            'card_hold_hours' => self::cardHoldHours(),
        ];
    }

    /**
     * @return array{
     *     brp_value: float,
     *     platform_fee_percent: float,
     *     card_brp_rate: float,
     *     ach_brp_rate: float,
     *     card_hold_hours: int
     * }
     */
    public static function adminPayload(): array
    {
        return self::frontendPayload();
    }
}
