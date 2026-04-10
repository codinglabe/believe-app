<?php

namespace App\Services;

use App\Models\MarketplaceProduct;
use App\Models\Merchant;
use App\Models\Order;
use App\Models\OrderItem;
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
     * Workbook / finance sheet model (customer total unchanged; fees come out of seller flow):
     * - Supplier/merchant: full {@see OrderSplit::$merchant_amount} (cost / fulfillment slice) — no Stripe deduction.
     * - Organization: nonprofit markup slice minus **card processing** (split vs merchant when both have a
     *   split and {@see Order::$organization_markup_basis} is set) and **order platform fee** (BIU % on org markup
     *   when markup basis &gt; 0, else on subtotal).
     * - When there is no nonprofit slice, merchant absorbs Stripe + platform (Printify-only style).
     *
     * @param  float|null  $organizationMarkupBasis  Stored on {@see Order}; null = pre-migration behavior (full Stripe attributed to org slice).
     * @return array{merchant_net: float, organization_net: float}
     */
    public static function workbookSellerPayouts(
        float $merchantGross,
        float $organizationGross,
        float $orderPlatformFee,
        float $stripeFeeUsd,
        ?float $organizationMarkupBasis,
        float $orderSubtotal,
    ): array {
        $stripe = max(0.0, $stripeFeeUsd);

        $stripeToOrg = $stripe;
        $stripeToMerchant = 0.0;
        if ($organizationGross > 0.01 && $merchantGross > 0.01 && $orderSubtotal > 0.01
            && $organizationMarkupBasis !== null && $organizationMarkupBasis > 0.0001) {
            $stripeToOrg = round($stripe * min(1.0, $organizationMarkupBasis / $orderSubtotal), 2);
            $stripeToMerchant = round(max(0.0, $stripe - $stripeToOrg), 2);
        }

        if ($organizationGross > 0.0) {
            $organizationNet = max(0.0, round($organizationGross - $orderPlatformFee - $stripeToOrg, 2));
            $merchantNet = max(0.0, round($merchantGross - $stripeToMerchant, 2));

            return [
                'merchant_net' => $merchantNet,
                'organization_net' => $organizationNet,
            ];
        }

        $merchantNet = max(0.0, round($merchantGross - $stripe - $orderPlatformFee, 2));

        return [
            'merchant_net' => $merchantNet,
            'organization_net' => 0.0,
        ];
    }

    /**
     * Recompute merchant / nonprofit / BIU cents from order lines when {@see OrderSplit} is missing
     * (same rules as {@see \App\Http\Controllers\CheckoutController} checkout).
     *
     * @return array{merchant_amount: float, organization_amount: float, biu_amount: float}|null
     */
    public static function inferRetailSplitFromOrder(Order $order): ?array
    {
        $order->loadMissing(['items.marketplaceProduct', 'items.organizationProduct.marketplaceProduct', 'items.product']);

        $splitMerchantCents = 0;
        $splitOrgCents = 0;
        $splitBiuCents = 0;

        foreach ($order->items as $item) {
            $lineSubtotal = (float) $item->subtotal;
            if ($lineSubtotal <= 0) {
                continue;
            }
            $lineCents = (int) round($lineSubtotal * 100);

            $mp = $item->marketplaceProduct;
            if (! $mp && $item->organization_product_id) {
                $op = $item->organizationProduct;
                $mp = $op?->marketplaceProduct;
            }
            if (! $mp && $item->product_id && $item->product) {
                $pid = $item->product->marketplace_product_id ?? null;
                if ($pid) {
                    $mp = MarketplaceProduct::query()->find((int) $pid);
                }
            }

            if (! $mp) {
                return null;
            }

            $pctM = (float) ($mp->pct_merchant ?? 0);
            $pctN = (float) ($mp->pct_nonprofit ?? 0);
            $useNonprofitSplit = $mp->nonprofit_marketplace_enabled
                && abs($pctM + $pctN) > 0.01;
            if ($useNonprofitSplit) {
                $mCents = (int) round($lineCents * $pctM / 100);
                $nCents = (int) round($lineCents * $pctN / 100);
                $bCents = $lineCents - $mCents - $nCents;
            } else {
                $mCents = $lineCents;
                $nCents = 0;
                $bCents = 0;
            }
            $splitMerchantCents += $mCents;
            $splitOrgCents += $nCents;
            $splitBiuCents += $bCents;
        }

        if ($splitMerchantCents + $splitOrgCents + $splitBiuCents <= 0) {
            return null;
        }

        return [
            'merchant_amount' => round($splitMerchantCents / 100, 2),
            'organization_amount' => round($splitOrgCents / 100, 2),
            'biu_amount' => round($splitBiuCents / 100, 2),
        ];
    }

    /**
     * Persisted {@see OrderSplit} when present; otherwise the same split logic as checkout (line-level inference).
     *
     * @return array{merchant_amount: float, organization_amount: float, biu_amount: float}
     */
    public static function resolveOrderSplitAmounts(Order $order): array
    {
        $order->loadMissing('orderSplit');
        $split = $order->orderSplit;
        if ($split !== null) {
            $m = (float) $split->merchant_amount;
            $o = (float) $split->organization_amount;
            $b = (float) $split->biu_amount;
            if (round($m + $o + $b, 2) > 0) {
                return [
                    'merchant_amount' => $m,
                    'organization_amount' => $o,
                    'biu_amount' => $b,
                ];
            }
        }

        $inferred = self::inferRetailSplitFromOrder($order);
        if ($inferred !== null) {
            return $inferred;
        }

        return [
            'merchant_amount' => 0.0,
            'organization_amount' => 0.0,
            'biu_amount' => 0.0,
        ];
    }

    /**
     * When no merchant/org line split can be resolved but goods subtotal &gt; 0: settlement is subtotal − platform − Stripe
     * (Printify-only). Allocate to org storefront vs supplier when there is no markup row.
     *
     * @return array{merchant_net: float, organization_net: float}
     */
    public static function workbookPayoutsWithoutSplit(Order $order, float $platformFee, float $stripeFeeUsd): array
    {
        $sub = (float) $order->subtotal;
        $stripe = max(0.0, $stripeFeeUsd);
        $payable = round(max(0.0, $sub - $platformFee - $stripe), 2);
        $orgCtx = self::organizationContextFromOrder($order);
        if ($orgCtx['organization_id'] !== null && (int) $orgCtx['organization_id'] > 0) {
            return [
                'merchant_net' => 0.0,
                'organization_net' => $payable,
            ];
        }

        return [
            'merchant_net' => $payable,
            'organization_net' => 0.0,
        ];
    }

    /**
     * Total settlement to merchant + nonprofit (supplier gross + org net after fees).
     * Without OrderSplit (e.g. Printify-only), uses subtotal − platform fee − Stripe.
     *
     * @param  float  $stripeFeeUsd  Actual Stripe processing fee for the charge (from balance transaction).
     */
    public static function netPayableFromOrder(Order $order, float $stripeFeeUsd = 0.0): float
    {
        $platformFee = (float) ($order->platform_fee ?? 0);
        $stripe = max(0.0, $stripeFeeUsd);
        $amounts = self::resolveOrderSplitAmounts($order);
        $merch = $amounts['merchant_amount'];
        $orgAmt = $amounts['organization_amount'];

        if (round($merch + $orgAmt, 2) > 0) {
            $markupBasis = $order->organization_markup_basis !== null ? (float) $order->organization_markup_basis : null;
            $nets = self::workbookSellerPayouts(
                $merch,
                $orgAmt,
                $platformFee,
                $stripe,
                $markupBasis,
                (float) $order->subtotal
            );

            return round($nets['merchant_net'] + $nets['organization_net'], 2);
        }

        $sub = (float) $order->subtotal;

        // Printify / catalog lines with no inferrable MarketplaceProduct split: single pool after fees.
        if ($sub > 0) {
            return round(max(0.0, $sub - $platformFee - $stripe), 2);
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
        $amounts = self::resolveOrderSplitAmounts($order);
        $merch = $amounts['merchant_amount'];
        $orgAmt = $amounts['organization_amount'];
        $biuSplit = $amounts['biu_amount'];
        $platformFee = (float) ($order->platform_fee ?? 0);
        $biuTotal = round($biuSplit + $platformFee, 2);
        $payable = self::netPayableFromOrder($order, $stripeFeeUsd);
        $stripe = max(0.0, $stripeFeeUsd);
        $markupBasis = $order->organization_markup_basis !== null ? (float) $order->organization_markup_basis : null;
        $sub = (float) $order->subtotal;

        if (round($merch + $orgAmt, 2) > 0) {
            $nets = self::workbookSellerPayouts($merch, $orgAmt, $platformFee, $stripe, $markupBasis, $sub);
        } elseif ((float) $order->subtotal > 0) {
            $nets = self::workbookPayoutsWithoutSplit($order, $platformFee, $stripe);
        } else {
            $nets = self::workbookSellerPayouts(0.0, 0.0, $platformFee, $stripe, $markupBasis, $sub);
        }
        $merchNet = $nets['merchant_net'];
        $orgNet = $nets['organization_net'];
        $orgCtx = self::organizationContextFromOrder($order);

        $platformPayout = round($platformFee + $biuSplit, 2);

        $row = [
            'source' => 'marketplace_order',
            'order_id' => $order->id,
            'gross_amount' => round((float) $order->total_amount, 2),
            'subtotal' => round((float) $order->subtotal, 2),
            'sales_tax' => round((float) ($order->tax_amount ?? 0), 2),
            'shipping_amount' => round((float) ($order->shipping_cost ?? 0), 2),
            'platform_fee' => round($platformFee, 2),
            'stripe_fee' => round(max(0, $stripeFeeUsd), 2),
            'merchant_payout' => round($merchNet, 2),
            'supplier_payout' => round($merchNet, 2),
            'organization_gross_share' => round($orgAmt, 2),
            'organization_payout' => round($orgNet, 2),
            'platform_payout' => $platformPayout,
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
        if ($order->organization_markup_basis !== null) {
            $row['organization_markup_basis'] = round((float) $order->organization_markup_basis, 2);
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
        $amounts = self::resolveOrderSplitAmounts($order);
        $merch = $amounts['merchant_amount'];
        $orgAmt = $amounts['organization_amount'];
        $biuSplit = $amounts['biu_amount'];
        $platformFee = (float) ($order->platform_fee ?? 0);

        $stripe = max(
            (float) ($financials['stripe_fee'] ?? 0),
            (float) $t->fee
        );

        $platformPayout = round($platformFee + $biuSplit, 2);
        $markupBasis = $order->organization_markup_basis !== null ? (float) $order->organization_markup_basis : null;
        $sub = (float) $order->subtotal;

        if (round($merch + $orgAmt, 2) > 0) {
            $nets = self::workbookSellerPayouts($merch, $orgAmt, $platformFee, $stripe, $markupBasis, $sub);
        } elseif ((float) $order->subtotal > 0) {
            $nets = self::workbookPayoutsWithoutSplit($order, $platformFee, $stripe);
        } else {
            $nets = self::workbookSellerPayouts(0.0, 0.0, $platformFee, $stripe, $markupBasis, $sub);
        }
        $merchNet = $nets['merchant_net'];
        $orgNet = $nets['organization_net'];

        $financials['gross_amount'] = round((float) $order->total_amount, 2);
        $financials['stripe_fee'] = round($stripe, 2);
        $financials['biu_fee'] = round($biuSplit + $platformFee, 2);
        $financials['split_deduction'] = round($orgAmt, 2);
        $financials['net_to_organization'] = self::netPayableFromOrder($order, $stripe);
        $financials['subtotal_amount'] = round((float) $order->subtotal, 2);
        $financials['sales_tax_amount'] = round((float) ($order->tax_amount ?? 0), 2);
        $financials['shipping_amount'] = round((float) ($order->shipping_cost ?? 0), 2);
        $financials['supplier_payout'] = round($merchNet, 2);
        $financials['organization_payout'] = round($orgNet, 2);
        $financials['platform_payout'] = $platformPayout;

        $supplier = self::ledgerSupplierFields($order);
        $financials['supplier_name'] = $supplier['supplier_name'];
        $financials['supplier_type'] = $supplier['supplier_type'];

        return $financials;
    }

    /**
     * Workbook-style supplier identity: Printify vs storefront merchant, etc.
     *
     * @return array{supplier_name: string|null, supplier_type: string|null}
     */
    public static function ledgerSupplierFields(Order $order): array
    {
        $order->loadMissing([
            'items.organizationProduct.organization',
            'items.organizationProduct.marketplaceProduct.merchant',
            'items.marketplaceProduct.merchant',
            'organization',
        ]);

        if ($order->is_printify_order) {
            return ['supplier_name' => 'Printify', 'supplier_type' => 'PRINTIFY'];
        }

        foreach ($order->items as $item) {
            $hub = self::resolveMerchantHubCatalogSupplier($item);
            if ($hub !== null) {
                return $hub;
            }
        }

        $org = $order->organization;
        if ($org !== null && filled($org->name)) {
            return ['supplier_name' => (string) $org->name, 'supplier_type' => 'ORG_STOREFRONT'];
        }

        foreach ($order->items as $item) {
            $op = $item->organizationProduct;
            if ($op !== null) {
                $op->loadMissing('organization');
                if ($op->organization !== null && filled($op->organization->name)) {
                    return [
                        'supplier_name' => (string) $op->organization->name,
                        'supplier_type' => 'ORG_STOREFRONT',
                    ];
                }
            }
        }

        return ['supplier_name' => null, 'supplier_type' => null];
    }

    /**
     * Ledger supplier display name for marketplace catalog lines: real merchant business, not the word "Merchant".
     */
    private static function merchantDisplayName(Merchant $merchant): ?string
    {
        if (filled($merchant->business_name)) {
            return (string) $merchant->business_name;
        }
        if (filled($merchant->name)) {
            return (string) $merchant->name;
        }

        return null;
    }

    /**
     * Merchant Hub / catalog SKU: direct MP checkout, nonprofit pool line, or org listing linked to marketplace_products.
     *
     * @return array{supplier_name: string, supplier_type: string}|null
     */
    private static function resolveMerchantHubCatalogSupplier(OrderItem $item): ?array
    {
        $mp = null;

        if (! empty($item->marketplace_product_id)) {
            $item->loadMissing('marketplaceProduct.merchant');
            $mp = $item->marketplaceProduct;
        }

        if ($mp === null && ! empty($item->organization_product_id)) {
            $item->loadMissing('organizationProduct.marketplaceProduct.merchant');
            $mp = $item->organizationProduct?->marketplaceProduct;
        }

        if ($mp === null && ! empty($item->product_id)) {
            $item->loadMissing('product.sourceMarketplaceProduct.merchant');
            $mp = $item->product?->sourceMarketplaceProduct;
        }

        if ($mp === null) {
            return null;
        }

        $mp->loadMissing('merchant');
        if ($mp->merchant === null) {
            return null;
        }

        $name = self::merchantDisplayName($mp->merchant);

        if ($name === null || $name === '') {
            return null;
        }

        return ['supplier_name' => $name, 'supplier_type' => 'MERCHANT_HUB'];
    }
}
