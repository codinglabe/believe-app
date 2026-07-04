<?php

namespace App\Services;

use App\Models\AdminSetting;
use App\Models\User;
use App\Support\BrpParticipationModule;

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

    /** Hold period (hours) applied to BP bought with a NEW (untrusted) card. */
    public const KEY_CARD_HOLD_HOURS = 'bp_purchase_card_hold_hours';

    /** Extra hold (hours) after ACH settlement before BP becomes Available. */
    public const KEY_ACH_HOLD_HOURS = 'bp_purchase_ach_hold_hours';

    /** Whether the supporter is charged the Stripe processing fee on top of their BP. */
    public const KEY_SUPPORTER_PAYS_PROCESSING_FEE = 'bp_purchase_supporter_pays_processing_fee';

    /** Whether the supporter is charged the BIU platform fee on top of their BP. */
    public const KEY_SUPPORTER_PAYS_PLATFORM_FEE = 'bp_purchase_supporter_pays_platform_fee';

    /**
     * When enabled, the purchaser is charged BP + payment processing fee + platform fee.
     * Alias for enabling both fee toggles together.
     */
    public const KEY_PAYER_COVERS_TRANSACTION_FEE = 'bp_purchase_payer_covers_transaction_fee';

    public const KEY_CARD_SETTLEMENT_BUSINESS_DAYS = 'bp_purchase_card_settlement_business_days';

    public const KEY_ACH_SETTLEMENT_BUSINESS_DAYS = 'bp_purchase_ach_settlement_business_days';

    public const KEY_REQUIRE_BRIDGE_RESERVE = 'bp_purchase_require_bridge_reserve_confirmation';

    public const DEFAULT_BRP_VALUE = 0.005;

    public const DEFAULT_PLATFORM_FEE_PERCENT = 1.0;

    public const DEFAULT_PROCESSING_FEE_PERCENT = 1.0;

    /** Believe Reward Points earned per qualifying BP purchase (>= min) by a Free supporter. */
    public const DEFAULT_FREE_BRP_AWARD = 1.0;

    /** Believe Reward Points earned per qualifying BP purchase (>= min) by a Prime supporter. */
    public const DEFAULT_PRIME_BRP_AWARD = 2.0;

    public const DEFAULT_CARD_HOLD_HOURS = 0;

    public const DEFAULT_ACH_HOLD_HOURS = 0;

    public const DEFAULT_SUPPORTER_PAYS_PROCESSING_FEE = true;

    public const DEFAULT_SUPPORTER_PAYS_PLATFORM_FEE = true;

    public const DEFAULT_PAYER_COVERS_TRANSACTION_FEE = true;

    public const DEFAULT_CARD_SETTLEMENT_BUSINESS_DAYS = 1;

    public const DEFAULT_ACH_SETTLEMENT_BUSINESS_DAYS = 3;

    public const DEFAULT_REQUIRE_BRIDGE_RESERVE = true;

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

    /**
     * Believe Reward Points earned per qualifying BP purchase by a Free (non-Prime) supporter.
     */
    public static function freeBrpAward(): float
    {
        return BrpParticipationSettingsService::freeAward(BrpParticipationModule::BP_PURCHASE);
    }

    /**
     * Believe Reward Points earned per qualifying BP purchase by a Prime supporter.
     */
    public static function primeBrpAward(): float
    {
        return BrpParticipationSettingsService::primeAward(BrpParticipationModule::BP_PURCHASE);
    }

    /**
     * Believe Reward Points earned per qualifying BP purchase, based on the buyer's
     * supporter membership tier (Free vs Prime).
     */
    public static function brpAwardForUser(?User $user): float
    {
        return BrpParticipationSettingsService::awardForUser($user, BrpParticipationModule::BP_PURCHASE);
    }

    /**
     * Hold period (hours) for BP bought with a NEW (untrusted) card.
     */
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

    /**
     * Alias for {@see cardHoldHours()} — the new-card security hold period.
     */
    public static function newCardHoldHours(): int
    {
        return self::cardHoldHours();
    }

    /**
     * Extra hold (hours) applied after ACH settlement before BP becomes Available.
     */
    public static function achHoldHours(): int
    {
        return max(0, (int) AdminSetting::get(self::KEY_ACH_HOLD_HOURS, self::DEFAULT_ACH_HOLD_HOURS));
    }

    public static function payerCoversTransactionFee(): bool
    {
        return (bool) AdminSetting::get(
            self::KEY_PAYER_COVERS_TRANSACTION_FEE,
            self::DEFAULT_PAYER_COVERS_TRANSACTION_FEE,
        );
    }

    public static function supporterPaysProcessingFee(): bool
    {
        if (self::payerCoversTransactionFee()) {
            return true;
        }

        return (bool) AdminSetting::get(self::KEY_SUPPORTER_PAYS_PROCESSING_FEE, self::DEFAULT_SUPPORTER_PAYS_PROCESSING_FEE);
    }

    public static function supporterPaysPlatformFee(): bool
    {
        if (self::payerCoversTransactionFee()) {
            return true;
        }

        return (bool) AdminSetting::get(self::KEY_SUPPORTER_PAYS_PLATFORM_FEE, self::DEFAULT_SUPPORTER_PAYS_PLATFORM_FEE);
    }

    /**
     * @return array<string, mixed>
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
            'new_card_hold_hours' => self::newCardHoldHours(),
            'ach_hold_hours' => self::achHoldHours(),
            'payer_covers_transaction_fee' => self::payerCoversTransactionFee(),
            'supporter_pays_processing_fee' => self::supporterPaysProcessingFee(),
            'supporter_pays_platform_fee' => self::supporterPaysPlatformFee(),
            'card_settlement_business_days' => self::cardSettlementBusinessDays(),
            'ach_settlement_business_days' => self::achSettlementBusinessDays(),
            'require_bridge_reserve_confirmation' => self::requireBridgeReserveConfirmation(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function adminPayload(): array
    {
        return self::frontendPayload();
    }
}
