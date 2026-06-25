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

    public const KEY_CARD_SETTLEMENT_BUSINESS_DAYS = 'bp_purchase_card_settlement_business_days';

    public const KEY_ACH_SETTLEMENT_BUSINESS_DAYS = 'bp_purchase_ach_settlement_business_days';

    public const KEY_REQUIRE_BRIDGE_RESERVE = 'bp_purchase_require_bridge_reserve_confirmation';

    public const KEY_FREE_BRP_REWARD = 'bp_purchase_free_brp_reward';

    public const KEY_PRIME_BRP_REWARD = 'bp_purchase_prime_brp_reward';

    public const DEFAULT_BRP_VALUE = 0.005;

    public const DEFAULT_PLATFORM_FEE_PERCENT = 1.0;

    public const DEFAULT_CARD_BRP_RATE = 2.0;

    public const DEFAULT_ACH_BRP_RATE = 1.0;

    public const DEFAULT_CARD_HOLD_HOURS = 0;

    public const DEFAULT_CARD_SETTLEMENT_BUSINESS_DAYS = 1;

    public const DEFAULT_ACH_SETTLEMENT_BUSINESS_DAYS = 3;

    public const DEFAULT_REQUIRE_BRIDGE_RESERVE = true;

    public const DEFAULT_FREE_BRP_REWARD = 5.0;

    public const DEFAULT_PRIME_BRP_REWARD = 10.0;

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

    public static function cardSettlementBusinessDays(): int
    {
        return max(0, (int) AdminSetting::get(self::KEY_CARD_SETTLEMENT_BUSINESS_DAYS, self::DEFAULT_CARD_SETTLEMENT_BUSINESS_DAYS));
    }

    public static function achSettlementBusinessDays(): int
    {
        return max(0, (int) AdminSetting::get(self::KEY_ACH_SETTLEMENT_BUSINESS_DAYS, self::DEFAULT_ACH_SETTLEMENT_BUSINESS_DAYS));
    }

    public static function requireBridgeReserveConfirmation(): bool
    {
        return (bool) AdminSetting::get(self::KEY_REQUIRE_BRIDGE_RESERVE, self::DEFAULT_REQUIRE_BRIDGE_RESERVE);
    }

    public static function freeBrpReward(): float
    {
        return max(0, (float) AdminSetting::get(self::KEY_FREE_BRP_REWARD, self::DEFAULT_FREE_BRP_REWARD));
    }

    public static function primeBrpReward(): float
    {
        return max(0, (float) AdminSetting::get(self::KEY_PRIME_BRP_REWARD, self::DEFAULT_PRIME_BRP_REWARD));
    }

    /**
     * @return array{
     *     brp_value: float,
     *     platform_fee_percent: float,
     *     card_brp_rate: float,
     *     ach_brp_rate: float,
     *     card_hold_hours: int,
     *     card_settlement_business_days: int,
     *     ach_settlement_business_days: int,
     *     require_bridge_reserve_confirmation: bool,
     *     free_brp_reward: float,
     *     prime_brp_reward: float
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
            'card_settlement_business_days' => self::cardSettlementBusinessDays(),
            'ach_settlement_business_days' => self::achSettlementBusinessDays(),
            'require_bridge_reserve_confirmation' => self::requireBridgeReserveConfirmation(),
            'free_brp_reward' => self::freeBrpReward(),
            'prime_brp_reward' => self::primeBrpReward(),
        ];
    }

    /**
     * @return array{
     *     brp_value: float,
     *     platform_fee_percent: float,
     *     card_brp_rate: float,
     *     ach_brp_rate: float,
     *     card_hold_hours: int,
     *     card_settlement_business_days: int,
     *     ach_settlement_business_days: int,
     *     require_bridge_reserve_confirmation: bool
     * }
     */
    public static function adminPayload(): array
    {
        return self::frontendPayload();
    }
}

