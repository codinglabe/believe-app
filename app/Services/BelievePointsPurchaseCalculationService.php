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

    public static function participationBrpReward(?User $user): float
    {
        if ($user !== null && BelievePointPurchaseSettlementStatusService::userCanTransferToWallet($user)) {
            return BelievePointsPurchaseSettingsService::primeBrpReward();
        }

        return BelievePointsPurchaseSettingsService::freeBrpReward();
    }

    public static function brpEarned(float $bpAmountUsd, string $rail, ?User $user = null): float
    {
        return round(self::participationBrpReward($user), 2);
    }

    public static function bpAvailabilityLabel(string $rail): string
    {
        if (in_array($rail, ['bank', 'ach'], true)) {
            $days = BelievePointsPurchaseSettingsService::achSettlementBusinessDays();

            return $days <= 1
                ? 'Processing BP until ACH settles (~1 business day)'
                : "Processing BP until ACH settles (~{$days} business days)";
        }

        $days = BelievePointsPurchaseSettingsService::cardSettlementBusinessDays();

        return $days <= 0
            ? 'Processing BP until card payout settles'
            : ($days === 1
                ? 'Processing BP until card payout settles (~1 business day)'
                : "Processing BP until card payout settles (~{$days} business days)");
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
    public static function checkoutBreakdown(float $bpAmountUsd, string $rail, bool $includeStripeProcessing = true, ?User $user = null): array
    {
        $rail = in_array($rail, ['bank', 'ach'], true) ? 'bank' : 'card';
        $bpAmountUsd = round(max(0, $bpAmountUsd), 2);
        $platformFee = self::platformFeeUsd($bpAmountUsd);
        $netBeforeProcessing = round($bpAmountUsd + $platformFee, 2);

        if ($includeStripeProcessing) {
            $checkoutTotal = $rail === 'bank'
                ? StripeProcessingFeeEstimator::grossUpAchChargeUsdForNetGiftUsd($netBeforeProcessing)
                : StripeProcessingFeeEstimator::grossUpCardChargeUsdForNetGiftUsd($netBeforeProcessing);
            $checkoutTotal = round($checkoutTotal, 2);
            $processingFee = round(max(0, $checkoutTotal - $bpAmountUsd - $platformFee), 2);
        } else {
            $checkoutTotal = $netBeforeProcessing;
            $processingFee = 0.0;
        }

        return [
            'bp_amount_usd' => $bpAmountUsd,
            'platform_fee_usd' => $platformFee,
            'processing_fee_usd' => $processingFee,
            'checkout_total_usd' => $checkoutTotal,
            'brp_earned' => self::brpEarned($bpAmountUsd, $rail, $user),
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
     *     card_brp_rate: float,
     *     ach_brp_rate: float,
     *     card_hold_hours: int
     * }
     */
    public static function feePreviewPayload(float $bpAmountUsd, string $rail, ?User $user = null): array
    {
        $breakdown = self::checkoutBreakdown($bpAmountUsd, $rail, true, $user);
        $cardCheckout = round(StripeProcessingFeeEstimator::grossUpCardChargeUsdForNetGiftUsd(
            round($bpAmountUsd + self::platformFeeUsd($bpAmountUsd), 2)
        ), 2);
        $achCheckout = round(StripeProcessingFeeEstimator::grossUpAchChargeUsdForNetGiftUsd(
            round($bpAmountUsd + self::platformFeeUsd($bpAmountUsd), 2)
        ), 2);

        return [
            'mode' => 'buyer_covers',
            'rail' => $breakdown['rail'],
            'bp_amount_usd' => $breakdown['bp_amount_usd'],
            'platform_fee_usd' => $breakdown['platform_fee_usd'],
            'processing_fee_usd' => $breakdown['processing_fee_usd'],
            'checkout_total_usd' => $breakdown['checkout_total_usd'],
            'brp_earned' => $breakdown['brp_earned'],
            'bp_availability' => $breakdown['bp_availability'],
            'card_processing_fee_usd' => round(StripeProcessingFeeEstimator::estimateCardFeeOnChargeUsd($cardCheckout), 2),
            'ach_processing_fee_usd' => round(StripeProcessingFeeEstimator::estimateAchFeeOnChargeUsd($achCheckout), 2),
            'brp_value' => BelievePointsPurchaseSettingsService::brpValue(),
            'platform_fee_percent' => BelievePointsPurchaseSettingsService::platformFeePercent(),
            'card_brp_rate' => BelievePointsPurchaseSettingsService::cardBrpRate(),
            'ach_brp_rate' => BelievePointsPurchaseSettingsService::achBrpRate(),
            'card_hold_hours' => BelievePointsPurchaseSettingsService::cardHoldHours(),
            'free_brp_reward' => BelievePointsPurchaseSettingsService::freeBrpReward(),
            'prime_brp_reward' => BelievePointsPurchaseSettingsService::primeBrpReward(),
            'participation_brp_reward' => self::participationBrpReward($user),
        ];
    }
}
