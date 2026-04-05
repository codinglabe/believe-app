<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Organization;
use App\Models\Transaction;

/**
 * Marketplace checkout → admin ledger: gross (buyer paid), fees, and net settlement owed to merchant + nonprofit.
 */
final class MarketplaceOrderLedgerService
{
    /**
     * Storefront / line-item nonprofit for ledger From–To (order.organization_id or first item with organization_id).
     *
     * @return array{organization_id: int|null, organization_name: string|null}
     */
    public static function organizationContextFromOrder(Order $order): array
    {
        $order->loadMissing('items');
        $oid = (int) ($order->organization_id ?? 0);
        if ($oid < 1) {
            $item = $order->items->first(static fn ($i) => ! empty($i->organization_id));
            if ($item) {
                $oid = (int) $item->organization_id;
            }
        }
        $name = $oid > 0 ? Organization::query()->whereKey($oid)->value('name') : null;

        return [
            'organization_id' => $oid > 0 ? $oid : null,
            'organization_name' => $name !== null && $name !== '' ? (string) $name : null,
        ];
    }

    /**
     * Amount owed to sellers (merchant + nonprofit) from OrderSplit; if no split row (e.g. Printify-only
     * storefront lines never wrote splits), fall back to product subtotal minus platform fee.
     */
    public static function netPayableFromOrder(Order $order): float
    {
        $order->loadMissing('orderSplit');
        $split = $order->orderSplit;
        $merch = $split ? (float) $split->merchant_amount : 0.0;
        $orgAmt = $split ? (float) $split->organization_amount : 0.0;
        $sum = round($merch + $orgAmt, 2);
        if ($sum > 0) {
            return $sum;
        }

        $sub = (float) $order->subtotal;
        $pf = (float) ($order->platform_fee ?? 0);

        // Printify / org catalog checkout often never creates OrderSplit (no Merchant Hub line split).
        if ($split === null && $sub > 0) {
            return round(max(0, $sub - $pf), 2);
        }

        return 0.0;
    }

    /**
     * Snapshot meta on `transactions` rows linked to {@see Order}.
     *
     * @return array<string, mixed>
     */
    public static function transactionMeta(Order $order, float $stripeFeeUsd = 0.0): array
    {
        $order->loadMissing('orderSplit');
        $split = $order->orderSplit;
        $merch = $split ? (float) $split->merchant_amount : 0.0;
        $orgAmt = $split ? (float) $split->organization_amount : 0.0;
        $biuSplit = $split ? (float) $split->biu_amount : 0.0;
        $platformFee = (float) ($order->platform_fee ?? 0);
        $biuTotal = round($biuSplit + $platformFee, 2);
        $payable = self::netPayableFromOrder($order);
        $orgCtx = self::organizationContextFromOrder($order);

        $row = [
            'source' => 'marketplace_order',
            'order_id' => $order->id,
            'gross_amount' => round((float) $order->total_amount, 2),
            'subtotal' => round((float) $order->subtotal, 2),
            'sales_tax' => round((float) ($order->tax_amount ?? 0), 2),
            'shipping_amount' => round((float) ($order->shipping_cost ?? 0), 2),
            'platform_fee' => round($platformFee, 2),
            'stripe_fee' => round(max(0, $stripeFeeUsd), 2),
            'merchant_payout' => round($merch, 2),
            'organization_payout' => round($orgAmt, 2),
            'biu_fee' => $biuTotal,
            'split_deduction' => round($orgAmt, 2),
            'net_to_organization' => $payable,
        ];
        if ($orgCtx['organization_id'] !== null) {
            $row['organization_id'] = $orgCtx['organization_id'];
        }
        if ($orgCtx['organization_name'] !== null) {
            $row['organization_name'] = $orgCtx['organization_name'];
        }

        return $row;
    }

    /**
     * Override ledger report numbers from the canonical order + split (fixes sparse or legacy transaction meta).
     *
     * @param  array<string, mixed>  $financials
     * @return array<string, mixed>
     */
    public static function mergeLedgerFinancials(Order $order, Transaction $t, array $financials): array
    {
        $order->loadMissing('orderSplit');
        $split = $order->orderSplit;
        $merch = $split ? (float) $split->merchant_amount : 0.0;
        $orgAmt = $split ? (float) $split->organization_amount : 0.0;
        $biuSplit = $split ? (float) $split->biu_amount : 0.0;
        $platformFee = (float) ($order->platform_fee ?? 0);

        $stripe = max(
            (float) ($financials['stripe_fee'] ?? 0),
            (float) $t->fee
        );

        $financials['gross_amount'] = round((float) $order->total_amount, 2);
        $financials['stripe_fee'] = round($stripe, 2);
        $financials['biu_fee'] = round($biuSplit + $platformFee, 2);
        $financials['split_deduction'] = round($orgAmt, 2);
        $financials['net_to_organization'] = self::netPayableFromOrder($order);
        $financials['subtotal_amount'] = round((float) $order->subtotal, 2);
        $financials['sales_tax_amount'] = round((float) ($order->tax_amount ?? 0), 2);
        $financials['shipping_amount'] = round((float) ($order->shipping_cost ?? 0), 2);

        return $financials;
    }
}
