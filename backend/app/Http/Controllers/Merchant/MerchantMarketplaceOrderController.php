<?php

namespace App\Http\Controllers\Merchant;

use App\Http\Controllers\Controller;
use App\Models\Merchant;
use App\Models\Order;
use App\Models\ShippoShipment;
use App\Services\ShippoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class MerchantMarketplaceOrderController extends Controller
{
    public function __construct(
        protected ShippoService $shippoService
    ) {}

    private function authMerchant(): Merchant
    {
        $m = Auth::guard('merchant')->user();
        if (! $m instanceof Merchant) {
            abort(403);
        }

        return $m;
    }

    /**
     * Orders that include this merchant's marketplace (pool) products — same checkout as organization pool.
     */
    public function index(Request $request): Response
    {
        $merchant = $this->authMerchant();

        $orders = Order::query()
            ->with([
                'user:id,name,email',
                'shippingInfo',
                'orderSplit',
                'items.marketplaceProduct',
                'items.organizationProduct.marketplaceProduct',
                'items.product',
            ])
            ->whereHas('items', function ($q) use ($merchant) {
                $q->where(function ($q2) use ($merchant) {
                    $q2->whereHas('marketplaceProduct', function ($mq) use ($merchant) {
                        $mq->where('merchant_id', $merchant->id);
                    })->orWhereHas('organizationProduct.marketplaceProduct', function ($mq) use ($merchant) {
                        $mq->where('merchant_id', $merchant->id);
                    });
                });
            })
            ->orderByDesc('created_at')
            ->paginate(20)
            ->withQueryString()
            ->through(function (Order $order) use ($merchant) {
                $merchantItems = $order->items->filter(function ($item) use ($merchant) {
                    $mp = $item->marketplaceProduct ?? $item->organizationProduct?->marketplaceProduct;

                    return $mp && (int) $mp->merchant_id === (int) $merchant->id;
                });

                $lines = [];
                $merchantShare = 0.0;
                foreach ($merchantItems as $item) {
                    $mp = $item->marketplaceProduct ?? $item->organizationProduct?->marketplaceProduct;
                    $pct = (float) ($mp->pct_merchant ?? 0);
                    $lineShare = round((float) $item->subtotal * $pct / 100, 2);
                    $merchantShare += $lineShare;
                    $lines[] = [
                        'product_name' => $mp->name,
                        'quantity' => (int) $item->quantity,
                        'line_total' => (float) $item->subtotal,
                        'merchant_share' => $lineShare,
                    ];
                }

                return [
                    'id' => $order->id,
                    'reference_number' => $order->reference_number,
                    'created_at' => $order->created_at?->toIso8601String(),
                    'status' => $order->status,
                    'payment_status' => $order->payment_status,
                    'total_amount' => (float) $order->total_amount,
                    'shipping_cost' => (float) ($order->shipping_cost ?? 0),
                    'customer_name' => $order->user?->name,
                    'customer_email' => $order->user?->email,
                    'tracking_number' => $order->tracking_number,
                    'tracking_url' => $order->tracking_url,
                    'label_url' => $order->label_url,
                    'carrier' => $order->carrier,
                    'shipping_status' => $order->shipping_status,
                    'lines' => $lines,
                    'merchant_share_total' => round($merchantShare, 2),
                    'split_merchant_amount' => $order->orderSplit
                        ? (float) $order->orderSplit->merchant_amount
                        : null,
                    'can_create_shippo_label' => $this->shippoService->isConfigured()
                        && $this->merchantMayUseShippoFlow($merchant, $order),
                ];
            });

        return Inertia::render('merchant/MarketplaceOrders/Index', [
            'orders' => $orders,
            'shippo_configured' => $this->shippoService->isConfigured(),
        ]);
    }

    /**
     * Get Shippo rates for an order this merchant is allowed to ship (merchant-only marketplace lines, no org manual-only lines).
     */
    public function getShippoRates(Order $order): JsonResponse
    {
        $merchant = $this->authMerchant();
        if (! $this->shippoService->isConfigured()) {
            return response()->json(['error' => 'Shipping is not configured.'], 503);
        }
        if (! $this->merchantMayUseShippoFlow($merchant, $order)) {
            return response()->json(['error' => 'You cannot create a label for this order.'], 403);
        }

        $result = $this->shippoService->createShipment($order);
        if (! $result['success']) {
            return response()->json(['error' => $result['error'] ?? 'Failed to get rates'], 422);
        }

        if (! empty($result['shipment_id'])) {
            $order->update(['shippo_shipment_id' => $result['shipment_id']]);
        }

        $shippingInfo = $order->shippingInfo;
        $shipToName = trim(($shippingInfo?->first_name ?? '').' '.($shippingInfo?->last_name ?? ''));
        $shipLines = $shippingInfo
            ? $this->shippoService->splitOrderShippingStreetLines($shippingInfo)
            : ['street1' => '', 'street2' => ''];
        $shipToStreet1 = $shipLines['street1'] ?: null;
        $parcel = $this->shippoService->getParcelSnapshot($order);

        ShippoShipment::updateOrCreate(
            ['order_id' => $order->id, 'product_type' => 'manual'],
            [
                'shippo_shipment_id' => $result['shipment_id'] ?? $order->shippo_shipment_id,
                'ship_to_name' => $shipToName ?: null,
                'ship_to_street1' => $shipToStreet1 ?: null,
                'ship_to_city' => $shippingInfo?->city ?: null,
                'ship_to_state' => $shippingInfo?->state ?: null,
                'ship_to_zip' => $shippingInfo?->zip ?: null,
                'ship_to_country' => $shippingInfo?->country ?: null,
                'parcel_weight_oz' => $parcel['weight'] ?? null,
                'parcel_length_in' => $parcel['length'] ?? null,
                'parcel_width_in' => $parcel['width'] ?? null,
                'parcel_height_in' => $parcel['height'] ?? null,
                'selected_rate_object_id' => null,
                'shippo_transaction_id' => null,
                'tracking_number' => null,
                'label_url' => null,
                'carrier' => null,
                'status' => null,
            ]
        );

        return response()->json([
            'shipment_id' => $result['shipment_id'] ?? null,
            'rates' => $result['rates'] ?? [],
        ]);
    }

    /**
     * Purchase a Shippo label for the selected rate.
     */
    public function purchaseShippoLabel(Request $request, Order $order): JsonResponse
    {
        $merchant = $this->authMerchant();
        $request->validate(['rate_object_id' => 'required|string|max:100']);

        if (! $this->shippoService->isConfigured()) {
            return response()->json(['error' => 'Shipping is not configured.'], 503);
        }
        if (! $this->merchantMayUseShippoFlow($merchant, $order)) {
            return response()->json(['error' => 'You cannot create a label for this order.'], 403);
        }
        if ($order->tracking_number) {
            return response()->json(['error' => 'A label has already been created for this order.'], 400);
        }

        $result = $this->shippoService->createTransaction($order, $request->rate_object_id);
        if (! $result['success']) {
            return response()->json(['error' => $result['error'] ?? 'Failed to purchase label'], 422);
        }

        $order->update([
            'shippo_transaction_id' => $result['transaction_id'] ?? null,
            'tracking_number' => $result['tracking_number'] ?? null,
            'tracking_url' => $result['tracking_url'] ?? null,
            'label_url' => $result['label_url'] ?? null,
            'carrier' => $result['carrier'] ?? null,
            'shipping_status' => 'label_created',
            'shipped_at' => now(),
        ]);

        ShippoShipment::updateOrCreate(
            ['order_id' => $order->id, 'product_type' => 'manual'],
            [
                'shippo_shipment_id' => $order->shippo_shipment_id,
                'selected_rate_object_id' => $request->rate_object_id,
                'shippo_transaction_id' => $result['transaction_id'] ?? null,
                'tracking_number' => $result['tracking_number'] ?? null,
                'label_url' => $result['label_url'] ?? null,
                'carrier' => $result['carrier'] ?? null,
                'status' => 'label_created',
            ]
        );

        return response()->json([
            'tracking_number' => $order->tracking_number,
            'tracking_url' => $order->tracking_url,
            'label_url' => $order->label_url,
            'carrier' => $order->carrier,
        ]);
    }

    /**
     * Paid, shippable order where this merchant is the only non-Printify seller (same rules as label creation, Shippo config not required).
     */
    private function merchantMayUseShippoFlow(Merchant $merchant, Order $order): bool
    {
        $order->loadMissing([
            'shippingInfo',
            'items.marketplaceProduct',
            'items.organizationProduct.marketplaceProduct',
            'items.product',
        ]);

        if ($order->payment_status !== 'paid' || ! $order->shippingInfo || $order->tracking_number) {
            return false;
        }

        if (! $this->orderHasManualOrPoolItem($order)) {
            return false;
        }

        return $this->merchantShipsEntireOrder($merchant, $order);
    }

    private function merchantShipsEntireOrder(Merchant $merchant, Order $order): bool
    {
        $hasMerchantLine = false;

        foreach ($order->items as $item) {
            if ($item->marketplace_product_id) {
                $mp = $item->marketplaceProduct;
                if (! $mp || (int) $mp->merchant_id !== (int) $merchant->id) {
                    return false;
                }
                $hasMerchantLine = true;

                continue;
            }

            if ($item->organization_product_id) {
                $mp = $item->organizationProduct?->marketplaceProduct;
                if (! $mp || (int) $mp->merchant_id !== (int) $merchant->id) {
                    return false;
                }
                $hasMerchantLine = true;

                continue;
            }

            $p = $item->product;
            if ($p && empty($p->printify_product_id)) {
                return false;
            }
        }

        return $hasMerchantLine;
    }

    /**
     * Same eligibility as organization Shippo labels (manual / pool / non-Printify catalog).
     */
    private function orderHasManualOrPoolItem(Order $order): bool
    {
        return $order->items->contains(function ($item) {
            if ($item->marketplace_product_id || $item->organization_product_id) {
                return true;
            }
            $p = $item->product;

            return $p && empty($p->printify_product_id);
        });
    }
}
