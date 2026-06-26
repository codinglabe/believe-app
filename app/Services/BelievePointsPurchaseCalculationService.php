<?php

namespace App\Services;

use App\Models\User;

/**
 * Purchase math for the Add Believe Points flow (not donations).
 */
final class BelievePointsPurchaseCalculationService
{
    /**
     * BIU platform fee. Charged to the supporter only when the
     * "Supporter Pays Platform Fee" admin toggle is enabled.
     */
    public static function platformFeeUsd(float $bpAmountUsd): float
    {
        if (! BelievePointsPurchaseSettingsService::supporterPaysPlatformFee()) {
            return 0.0;
        }

        $bpAmountUsd = round(max(0, $bpAmountUsd), 2);
        $percent = BelievePointsPurchaseSettingsService::platformFeePercent();

        return round($bpAmountUsd * ($percent / 100), 2);
    }

    /**
     * Stripe payment processing fee, computed as a gross-up over the amount BIU must
     * net ($bp + platform fee) so the full BP value is funded in the Master Reserve.
     * Charged to the supporter only when "Supporter Pays Processing Fee" is enabled.
     */
    public static function processingFeeUsd(float $netToFundUsd, string $rail = 'card'): float
    {
        if (! BelievePointsPurchaseSettingsService::supporterPaysProcessingFee()) {
            return 0.0;
        }

        $net = round(max(0, $netToFundUsd), 2);
        if ($net <= 0) {
            return 0.0;
        }

        $gross = in_array($rail, ['bank', 'ach'], true)
            ? StripeProcessingFeeEstimator::grossUpAchChargeUsdForNetGiftUsd($net)
            : StripeProcessingFeeEstimator::grossUpCardChargeUsdForNetGiftUsd($net);

        return round(max(0, $gross - $net), 2);
    }

    /**
     * Believe Reward Points earned for the purchase: per-$1 rate (based on the buyer's
     * Free/Prime membership tier) multiplied by the BP dollar amount.
     */
    public static function brpEarned(float $bpAmountUsd, ?User $user = null): float
    {
        $bpAmountUsd = round(max(0, $bpAmountUsd), 2);
        $perDollar = BelievePointsPurchaseSettingsService::brpAwardForUser($user);

        return round($bpAmountUsd * $perDollar, 2);
    }

    public static function bpAvailabilityLabel(string $rail, bool $isTrustedCard = false): string
    {
        if (in_array($rail, ['bank', 'ach'], true)) {
            $hours = BelievePointsPurchaseSettingsService::achHoldHours();

            if ($hours === 0) {
                return 'After ACH settlement';
            }

            return $hours === 1
                ? 'After ACH settlement (plus 1-hour hold)'
                : "After ACH settlement (plus {$hours}-hour hold)";
        }

        if ($isTrustedCard) {
            return 'Available immediately';
        }

        $hours = BelievePointsPurchaseSettingsService::newCardHoldHours();

        if ($hours === 0) {
            return 'Available immediately';
        }

        return $hours === 1
            ? 'After 1-hour hold'
            : "After {$hours}-hour hold";
    }

    /**
     * @return array{
     *     bp_amount_usd: float,
     *     platform_fee_usd: float,
     *     processing_fee_usd: float,
     *     checkout_total_usd: float,
     *     brp_earned: float,
     *     bp_availability: string,
     *     rail: string
     * }
     */
    public static function checkoutBreakdown(float $bpAmountUsd, string $rail, ?User $user = null, bool $isTrustedCard = false): array
    {
        $rail = in_array($rail, ['bank', 'ach'], true) ? 'bank' : 'card';
        $bpAmountUsd = round(max(0, $bpAmountUsd), 2);
        $platformFee = self::platformFeeUsd($bpAmountUsd);
        $netToFund = round($bpAmountUsd + $platformFee, 2);
        $processingFee = self::processingFeeUsd($netToFund, $rail);
        $checkoutTotal = round($bpAmountUsd + $platformFee + $processingFee, 2);

        return [
            'bp_amount_usd' => $bpAmountUsd,
            'platform_fee_usd' => $platformFee,
            'processing_fee_usd' => $processingFee,
            'checkout_total_usd' => $checkoutTotal,
            'brp_earned' => self::brpEarned($bpAmountUsd, $user),
            'bp_availability' => self::bpAvailabilityLabel($rail, $isTrustedCard),
            'rail' => $rail,
        ];
    }

    /**
     * @return array{
     *     mode: string,
     *     rail: string,
     *     bp_amount_usd: float,
     *     platform_fee_usd: float,
     *     processing_fee_usd: float,
     *     checkout_total_usd: float,
     *     brp_earned: float,
     *     bp_availability: string,
     *     card_processing_fee_usd: float,
     *     ach_processing_fee_usd: float,
     *     brp_value: float,
     *     platform_fee_percent: float,
     *     processing_fee_percent: float,
     *     free_brp_award: float,
     *     prime_brp_award: float,
     *     brp_award: float,
     *     card_hold_hours: int,
     *     new_card_hold_hours: int,
     *     ach_hold_hours: int,
     *     supporter_pays_processing_fee: bool,
     *     supporter_pays_platform_fee: bool
     * }
     */
    public static function feePreviewPayload(float $bpAmountUsd, string $rail, ?User $user = null, bool $isTrustedCard = false): array
    {
        $breakdown = self::checkoutBreakdown($bpAmountUsd, $rail, $user, $isTrustedCard);
        $checkoutTotal = $breakdown['checkout_total_usd'];

        return [
            'mode' => 'buyer_covers',
            'rail' => $breakdown['rail'],
            'bp_amount_usd' => $breakdown['bp_amount_usd'],
            'platform_fee_usd' => $breakdown['platform_fee_usd'],
            'processing_fee_usd' => $breakdown['processing_fee_usd'],
            'checkout_total_usd' => $checkoutTotal,
            'brp_earned' => $breakdown['brp_earned'],
            'bp_availability' => $breakdown['bp_availability'],
            'card_processing_fee_usd' => round(StripeProcessingFeeEstimator::estimateCardFeeOnChargeUsd($checkoutTotal), 2),
            'ach_processing_fee_usd' => round(StripeProcessingFeeEstimator::estimateAchFeeOnChargeUsd($checkoutTotal), 2),
            'brp_value' => BelievePointsPurchaseSettingsService::brpValue(),
            'platform_fee_percent' => BelievePointsPurchaseSettingsService::platformFeePercent(),
            'processing_fee_percent' => BelievePointsPurchaseSettingsService::processingFeePercent(),
            'free_brp_award' => BelievePointsPurchaseSettingsService::freeBrpAward(),
            'prime_brp_award' => BelievePointsPurchaseSettingsService::primeBrpAward(),
            'brp_award' => BelievePointsPurchaseSettingsService::brpAwardForUser($user),
            'card_hold_hours' => BelievePointsPurchaseSettingsService::cardHoldHours(),
            'new_card_hold_hours' => BelievePointsPurchaseSettingsService::newCardHoldHours(),
            'ach_hold_hours' => BelievePointsPurchaseSettingsService::achHoldHours(),
            'supporter_pays_processing_fee' => BelievePointsPurchaseSettingsService::supporterPaysProcessingFee(),
            'supporter_pays_platform_fee' => BelievePointsPurchaseSettingsService::supporterPaysPlatformFee(),
        ];
    }
}
