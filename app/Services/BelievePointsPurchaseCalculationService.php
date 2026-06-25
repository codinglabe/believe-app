<?php

namespace App\Services;

use App\Models\User;

/**
 * Purchase math for the Add Believe Points flow (not donations).
 */
final class BelievePointsPurchaseCalculationService
{
    public static function platformFeeUsd(float $bpAmountUsd): float
    {
        $bpAmountUsd = round(max(0, $bpAmountUsd), 2);
        $percent = BelievePointsPurchaseSettingsService::platformFeePercent();

        return round($bpAmountUsd * ($percent / 100), 2);
    }

    public static function processingFeeUsd(float $bpAmountUsd): float
    {
        $bpAmountUsd = round(max(0, $bpAmountUsd), 2);
        $percent = BelievePointsPurchaseSettingsService::processingFeePercent();

        return round($bpAmountUsd * ($percent / 100), 2);
    }

    /**
     * Flat Believe Reward Points awarded per purchase, based on the buyer's
     * supporter membership tier (Free vs Prime) — independent of amount or rail.
     */
    public static function brpEarned(?User $user = null): float
    {
        return round(BelievePointsPurchaseSettingsService::brpAwardForUser($user), 2);
    }

    public static function bpAvailabilityLabel(string $rail): string
    {
        if (in_array($rail, ['bank', 'ach'], true)) {
            return 'After ACH settlement';
        }

        $hours = BelievePointsPurchaseSettingsService::cardHoldHours();

        return $hours === 1
            ? 'After 1-Hour Security Review'
            : "After {$hours}-Hour Security Review";
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
    public static function checkoutBreakdown(float $bpAmountUsd, string $rail, ?User $user = null): array
    {
        $rail = in_array($rail, ['bank', 'ach'], true) ? 'bank' : 'card';
        $bpAmountUsd = round(max(0, $bpAmountUsd), 2);
        $platformFee = self::platformFeeUsd($bpAmountUsd);
        $processingFee = self::processingFeeUsd($bpAmountUsd);
        $checkoutTotal = round($bpAmountUsd + $platformFee + $processingFee, 2);

        return [
            'bp_amount_usd' => $bpAmountUsd,
            'platform_fee_usd' => $platformFee,
            'processing_fee_usd' => $processingFee,
            'checkout_total_usd' => $checkoutTotal,
            'brp_earned' => self::brpEarned($user),
            'bp_availability' => self::bpAvailabilityLabel($rail),
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
     *     card_hold_hours: int
     * }
     */
    public static function feePreviewPayload(float $bpAmountUsd, string $rail, ?User $user = null): array
    {
        $breakdown = self::checkoutBreakdown($bpAmountUsd, $rail, $user);
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
        ];
    }
}
