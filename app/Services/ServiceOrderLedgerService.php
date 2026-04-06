<?php

namespace App\Services;

use App\Models\ServiceOrder;
use App\Models\Transaction;

/**
 * Service Hub orders → ledger: seller pool pays card processing and platform fees (same workbook idea as marketplace org slice).
 */
final class ServiceOrderLedgerService
{
    /**
     * @param  array<string, mixed>  $financials
     * @return array<string, mixed>
     */
    public static function mergeLedgerFinancials(ServiceOrder $order, Transaction $t, array $financials): array
    {
        $supplier = (float) $order->seller_earnings;
        $platform = (float) $order->platform_fee + (float) $order->transaction_fee;
        $buyerTotal = round((float) $order->amount + (float) $order->sales_tax, 2);

        $stripe = max(
            (float) ($financials['stripe_fee'] ?? 0),
            (float) $t->fee
        );

        $financials['gross_amount'] = $buyerTotal > 0 ? $buyerTotal : round((float) $order->amount, 2);
        $financials['stripe_fee'] = round($stripe, 2);
        // Processing + platform come out of seller earnings (no separate org markup on Service Hub today).
        $supplierNet = max(0.0, round($supplier - $stripe - $platform, 2));
        $financials['supplier_payout'] = round($supplierNet, 2);
        $financials['organization_payout'] = 0.0;
        $financials['platform_payout'] = round($platform, 2);
        $financials['net_to_organization'] = round($supplierNet, 2);
        $financials['subtotal_amount'] = round((float) $order->amount, 2);
        $financials['sales_tax_amount'] = round((float) $order->sales_tax, 2);
        $financials['shipping_amount'] = $financials['shipping_amount'] ?? null;

        return $financials;
    }
}
