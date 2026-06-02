<?php

namespace App\Services;

use App\Models\GiftCard;
use App\Models\Transaction;

/**
 * Gift card purchases → unified transaction ledger financials.
 */
final class GiftCardLedgerService
{
    /**
     * @param  array<string, mixed>  $financials
     * @return array<string, mixed>
     */
    public static function mergeLedgerFinancials(GiftCard $giftCard, Transaction $t, array $financials): array
    {
        $saleAmount = (float) ($giftCard->amount ?? $t->amount);
        $buyerTotal = round(max(0.0, $saleAmount), 2);

        $stripe = max(
            (float) ($financials['stripe_fee'] ?? 0),
            (float) $t->fee
        );

        $financials['gross_amount'] = $buyerTotal > 0 ? $buyerTotal : round((float) $t->amount, 2);
        $financials['stripe_fee'] = round($stripe, 2);
        $financials['gift_card_sales'] = $financials['gross_amount'];
        $financials['biu_fee'] = 0.0;
        $financials['platform_fee'] = 0.0;

        $provider = $giftCard->total_commission !== null ? (float) $giftCard->total_commission : null;
        $biu = $giftCard->platform_commission !== null ? (float) $giftCard->platform_commission : null;
        $org = $giftCard->nonprofit_commission !== null ? (float) $giftCard->nonprofit_commission : null;
        $merchant = (float) ($giftCard->merchant_revenue ?? 0);

        if ($provider !== null && $provider > 0) {
            $financials['provider_commission'] = round($provider, 2);
        }
        if ($biu !== null && $biu > 0) {
            $financials['biu_revenue_share'] = round($biu, 2);
            $financials['platform_payout'] = round($biu, 2);
        }
        if ($org !== null && $org > 0) {
            $financials['organization_revenue'] = round($org, 2);
            $financials['organization_payout'] = round($org, 2);
            $financials['net_to_organization'] = round($org, 2);
        }
        if ($merchant > 0) {
            $financials['merchant_revenue'] = round($merchant, 2);
            $financials['merchant_payout'] = round($merchant, 2);
        } else {
            $financials['merchant_revenue'] = 0.0;
            $financials['merchant_payout'] = 0.0;
        }

        $financials['supplier_payout'] = 0.0;

        $giftCard->loadMissing('organization');
        if ($giftCard->organization !== null) {
            $financials['organization_name'] = (string) $giftCard->organization->name;
        }

        return $financials;
    }
}
