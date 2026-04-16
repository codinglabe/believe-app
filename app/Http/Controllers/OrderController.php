<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\ShippoShipment;
use App\Models\User;
use App\Services\MarketplacePoolRevenueSplit;
use App\Services\PrintifyService;
use App\Services\ShippoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Stripe\Refund;
use Stripe\Stripe;

class OrderController extends Controller
{
    protected $printifyService;

    protected $shippoService;

    public function __construct(PrintifyService $printifyService, ShippoService $shippoService)
    {
        $this->printifyService = $printifyService;
        $this->shippoService = $shippoService;
        Stripe::setApiKey(config('services.stripe.secret'));
    }

    /**
     * Organization users may only access their own orders; avoid null organization dereference.
     */
    protected function organizationOrderJsonAuth(Order $order): ?JsonResponse
    {
        $user = auth()->user();
        if ($user->role !== 'organization') {
            return null;
        }
        $org = $user->organization;
        if (! $org || (int) $order->organization_id !== (int) $org->id) {
            return response()->json(['error' => 'Unauthorized.'], 403);
        }

        return null;
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): Response
    {
        $perPage = $request->get('per_page', 10);
        $page = $request->get('page', 1);
        $search = $request->get('search', '');

        $query = Order::query();

        // Filter by organization if user is organization
        if (auth()->user()->role === 'organization') {
            $query->where('organization_id', auth()->user()->organization->id);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('reference_number', 'LIKE', "%{$search}%")
                    ->orWhereHas('user', function ($q) use ($search) {
                        $q->where('name', 'LIKE', "%{$search}%")
                            ->orWhere('email', 'LIKE', "%{$search}%");
                    });
            });
        }

        $orders = $query->with(['user', 'shippingInfo', 'items.product'])
            ->orderBy('created_at', 'desc')
            ->paginate($perPage, ['*'], 'page', $page);

        // delivery_status_label, product_type, can_create_shippo_label, etc. come from Order $appends accessors
        // so they are included in Inertia/JSON (dynamic ->property assignments are NOT serialized).

        return Inertia::render('orders/index', [
            'orders' => $orders,
            'filters' => [
                'per_page' => (int) $perPage,
                'page' => (int) $page,
                'search' => $search,
            ],
            'allowedPerPage' => [5, 10, 25, 50, 100],
            'userRole' => auth()->user()->role,
        ]);
    }

    /**
     * Display order items for admin (filtered by organization if specified)
     */
    public function itemsByOrganization(Request $request, Order $order)
    {
        // Authorization - admin only or organization owner
        if (auth()->user()->role === 'organization' && $order->organization_id !== auth()->user()->organization->id) {
            abort(403, 'Unauthorized action.');
        }

        $organizationFilter = $request->get('organization_id', '');

        $query = $order->items();

        // Filter by organization if specified and user is admin
        if ($organizationFilter && auth()->user()->role === 'admin') {
            $query->where('organization_id', $organizationFilter);
        }

        $items = $query->with([
            'product',
            'organization',
            'marketplaceProduct',
            'organizationProduct.marketplaceProduct',
        ])->get();

        $itemsData = $items->map(function ($item) {
            $line = $this->orderItemDisplayLine($item);

            return [
                'id' => $item->id,
                'order_id' => $item->order_id,
                'product_id' => $item->product_id,
                'organization_product_id' => $item->organization_product_id,
                'marketplace_product_id' => $item->marketplace_product_id,
                'organization_id' => $item->organization_id,
                'name' => $line['name'],
                'quantity' => $item->quantity,
                'unit_price' => $item->unit_price,
                'subtotal' => $item->subtotal,
                'product' => $item->product ? [
                    'id' => $item->product->id,
                    'name' => $item->product->name,
                    'image' => $item->product->image,
                ] : [
                    'id' => null,
                    'name' => $line['name'],
                    'image' => $line['image'],
                ],
                'organization' => $item->organization ? [
                    'id' => $item->organization->id,
                    'name' => $item->organization->name,
                ] : null,
            ];
        });

        return response()->json([
            'items' => $itemsData,
            'total' => $items->count(),
            'order' => [
                'id' => $order->id,
                'reference_number' => $order->reference_number,
                'total_amount' => $order->total_amount,
                'shipping_cost' => $order->shipping_cost,
                'tax_amount' => $order->tax_amount,
            ],
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(Order $order)
    {
        // Authorization check - organization can only see their orders
        if (auth()->user()->role === 'organization' && $order->organization_id !== auth()->user()->organization->id) {
            abort(403, 'Unauthorized action.');
        }

        $order->load([
            'orderSplit',
            'user',
            'shippingInfo',
            'items.product.sourceMarketplaceProduct.merchant',
            'items.marketplaceProduct.merchant',
            'items.organizationProduct.marketplaceProduct.merchant',
        ]);

        // Calculate order subtotal (products only)
        $orderSubtotal = $order->items->sum(function ($item) {
            return $item->unit_price * $item->quantity;
        });

        // Profit margin: first catalog product line with stored markup (Printify), else default
        $profitMarginRate = (float) config('app.printify_profit_margin', 25);
        foreach ($order->items as $item) {
            if ($item->product && $item->product->profit_margin_percentage !== null) {
                $profitMarginRate = (float) $item->product->profit_margin_percentage;
                break;
            }
        }

        // Get Printify order details if available for calculations
        $printifyProductCost = 0;
        $printifyShipping = 0;
        $printifyTax = 0;

        if ($order->printify_order_id) {
            try {
                $printifyOrder = $this->printifyService->getOrder($order->printify_order_id);
                $printifyProductCost = isset($printifyOrder['total_price']) ? $printifyOrder['total_price'] / 100 : 0;
                $printifyShipping = isset($printifyOrder['total_shipping']) ? $printifyOrder['total_shipping'] / 100 : 0;
                $printifyTax = isset($printifyOrder['total_tax']) ? $printifyOrder['total_tax'] / 100 : 0;
            } catch (\Exception $e) {
                \Log::error('Error fetching Printify order for calculations: '.$e->getMessage());
            }
        }

        // Calculate financial breakdown
        // Product Price = Printify Product Cost * (1 + Profit Margin %)
        $productPrice = $printifyProductCost > 0
            ? $printifyProductCost * (1 + ($profitMarginRate / 100))
            : $order->subtotal;

        $shippingCharged = $order->shipping_cost ?? 0;
        $salesTaxCollected = $order->tax_amount ?? 0;

        // Sales Tax Rate % = (Sales Tax Collected / (Product Price + Shipping Charged)) * 100
        $salesTaxRate = ($productPrice + $shippingCharged) > 0
            ? ($salesTaxCollected / ($productPrice + $shippingCharged)) * 100
            : 0;

        $platformFee = (float) ($order->platform_fee ?? 0);

        // Customer Total Paid = Product Price + platform fee + Shipping Charged + Sales Tax Collected
        $customerTotalPaid = $productPrice + $platformFee + $shippingCharged + $salesTaxCollected;

        // Recognized Revenue = Product Price + Shipping Charged (NOT including tax)
        $recognizedRevenue = $productPrice + $shippingCharged;

        // Gross Profit = Recognized Revenue - Printify Product Cost - Printify Shipping
        $grossProfit = $recognizedRevenue - $printifyProductCost - $printifyShipping;

        $platformPaymentFee = $platformFee;

        $orderData = [
            'id' => $order->id,
            'reference_number' => $order->reference_number,
            'total_amount' => $order->total_amount,
            'subtotal_amount' => $orderSubtotal, // Add subtotal
            'shipping_cost' => $order->shipping_cost,
            'tax_amount' => $order->tax_amount,
            'stripe_fee_amount' => $order->stripe_fee_amount,
            'platform_fee' => $order->platform_fee,
            'subtotal' => $order->subtotal,
            'donation_amount' => $order->donation_amount,
            'fee' => $order->fee ?? 0, // Make sure fee is included
            'status' => $order->status,
            'payment_status' => $order->payment_status,
            'printify_order_id' => $order->printify_order_id,
            'printify_status' => $order->printify_status,
            'created_at' => $order->created_at,
            'paid_at' => $order->paid_at,
            // Financial breakdown for admin/org view
            'financial_breakdown' => [
                'printify_product_cost' => $printifyProductCost,
                'profit_margin_rate' => $profitMarginRate,
                'product_price' => $productPrice,
                'shipping_charged' => $shippingCharged,
                'sales_tax_rate' => $salesTaxRate,
                'sales_tax_collected' => $salesTaxCollected,
                'customer_total_paid' => $customerTotalPaid,
                'recognized_revenue' => $recognizedRevenue,
                'gross_profit' => $grossProfit,
                'platform_payment_fee' => $platformPaymentFee,
                'printify_shipping' => $printifyShipping,
                'printify_tax' => $printifyTax,
                'printify_tax_amount' => (float) ($order->printify_tax_amount ?? 0),
                'additional_sales_tax_adjustment' => (float) ($order->additional_sales_tax_adjustment ?? 0),
            ],
            'user' => [
                'id' => $order->user->id,
                'name' => $order->user->name,
                'email' => $order->user->email,
            ],
            'shipping_info' => $order->shippingInfo ? [
                'first_name' => $order->shippingInfo->first_name,
                'last_name' => $order->shippingInfo->last_name,
                'email' => $order->shippingInfo->email,
                'phone' => $order->shippingInfo->phone,
                'address' => $order->shippingInfo->shipping_address,
                'city' => $order->shippingInfo->city,
                'state' => $order->shippingInfo->state,
                'zip' => $order->shippingInfo->zip,
                'country' => $order->shippingInfo->country,
            ] : null,
            'items' => $order->items->map(function ($item) {
                $line = $this->orderItemDisplayLine($item);

                return [
                    'id' => $item->id,
                    'product_id' => $item->product_id,
                    'organization_product_id' => $item->organization_product_id,
                    'marketplace_product_id' => $item->marketplace_product_id,
                    'name' => $line['name'],
                    'description' => $line['description'],
                    'image' => $line['image'],
                    'printify_product_id' => $line['printify_product_id'],
                    'quantity' => $item->quantity,
                    'unit_price' => $item->unit_price,
                    'total_price' => $item->subtotal,
                    'printify_variant_id' => $item->printify_variant_id,
                    'variant_data' => $this->getVariantData($item->variant_data),
                    'is_manual_product' => $line['is_manual_product'],
                    'merchant_hub_revenue' => $this->merchantHubRevenueSplitForItem($item),
                ];
            }),
            'merchant_hub_order_summary' => $this->merchantHubOrderSummary($order),
            'order_split' => $order->orderSplit ? [
                'merchant_amount' => (float) $order->orderSplit->merchant_amount,
                'organization_amount' => (float) $order->orderSplit->organization_amount,
                'biu_amount' => (float) $order->orderSplit->biu_amount,
            ] : null,
        ];

        // Get Printify order details if available
        if ($order->printify_order_id) {
            try {
                $printifyOrder = $this->printifyService->getOrder($order->printify_order_id);
                $orderData['printify_details'] = $this->formatPrintifyOrderData($printifyOrder);
            } catch (\Exception $e) {
                \Log::error('Error fetching Printify order: '.$e->getMessage());
                $orderData['printify_details'] = null;
                $orderData['printify_error'] = $e->getMessage();
            }
        }

        $orderData['tracking_number'] = $order->tracking_number;
        $orderData['tracking_url'] = $order->tracking_url;
        $orderData['label_url'] = $order->label_url;
        $orderData['shipping_status'] = $order->shipping_status;
        $orderData['carrier'] = $order->carrier;
        $hasManualProduct = $this->orderHasManualOrPoolItem($order);
        $orderData['has_manual_product'] = $hasManualProduct;
        $orderData['can_create_shippo_label'] = $hasManualProduct
            && $order->payment_status === 'paid'
            && $order->shippingInfo
            && empty($order->tracking_number);
        $orderData['shippo_configured'] = $this->shippoService->isConfigured();

        return Inertia::render('orders/show', [
            'order' => $orderData,
            'userRole' => auth()->user()->role,
        ]);
    }

    /**
     * Get Shippo shipping rates for an order (manual/bidding products).
     */
    public function getShippoRates(Order $order)
    {
        $authResponse = $this->organizationOrderJsonAuth($order);
        if ($authResponse !== null) {
            return $authResponse;
        }
        if (! $this->shippoService->isConfigured()) {
            return response()->json(['error' => 'Shipping is not configured.'], 503);
        }
        $hasManual = $this->orderHasManualOrPoolItem($order);
        if (! $hasManual || $order->payment_status !== 'paid' || ! $order->shippingInfo) {
            return response()->json(['error' => 'Order is not eligible for Shippo labels.'], 400);
        }

        $result = $this->shippoService->createShipment($order);
        if (! $result['success']) {
            return response()->json(['error' => $result['error'] ?? 'Failed to get rates'], 422);
        }

        if (! empty($result['shipment_id'])) {
            $order->update(['shippo_shipment_id' => $result['shipment_id']]);
        }

        // Create/update internal shipment record (manual-only) so webhook can update status.
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
                // Not yet selected/purchased
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
    public function purchaseShippoLabel(Request $request, Order $order)
    {
        $authResponse = $this->organizationOrderJsonAuth($order);
        if ($authResponse !== null) {
            return $authResponse;
        }
        $request->validate(['rate_object_id' => 'required|string|max:100']);
        if (! $this->shippoService->isConfigured()) {
            return response()->json(['error' => 'Shipping is not configured.'], 503);
        }
        $hasManual = $this->orderHasManualOrPoolItem($order);
        if (! $hasManual || $order->payment_status !== 'paid' || ! $order->shippingInfo) {
            return response()->json(['error' => 'Order is not eligible for Shippo labels.'], 400);
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

        // Persist selected rate + transaction details for webhook status updates.
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
     * Cancel order in Printify
     */
    public function cancelOrder(Request $request, Order $order)
    {
        // Authorization check
        if (auth()->user()->role === 'organization' && $order->organization_id !== auth()->user()->organization->id) {
            return response()->json(['error' => 'Unauthorized action.'], 403);
        }

        if (! $order->printify_order_id) {
            return response()->json(['error' => 'No Printify order ID found.'], 400);
        }

        try {
            $cancelResponse = $this->printifyService->cancelOrder($order->printify_order_id);

            \Log::info('Printify cancel response received', [
                'order_id' => $order->id,
                'printify_order_id' => $order->printify_order_id,
                'response_status' => $cancelResponse['status'] ?? 'not_set',
                'response' => $cancelResponse,
            ]);

            // Check if cancellation was successful (status can be 'canceled' or 'cancelled')
            $isCancelled = isset($cancelResponse['status']) &&
                          (strtolower($cancelResponse['status']) === 'canceled' ||
                           strtolower($cancelResponse['status']) === 'cancelled');

            if ($isCancelled) {
                // Process refund (Stripe or Believe Points)
                $refundResult = $this->processRefund($order);

                if (! $refundResult['success']) {
                    \Log::error('Refund failed after Printify cancellation', [
                        'order_id' => $order->id,
                        'refund_result' => $refundResult,
                    ]);

                    return redirect()->back()->withErrors([
                        'error' => 'Order cancelled in Printify but refund failed: '.$refundResult['message'],
                    ]);
                }

                // Update local order status
                $updateData = [
                    'status' => 'cancelled',
                    'printify_status' => 'cancelled',
                    'payment_status' => 'refunded',
                    'refunded_at' => now(),
                ];

                // Only set stripe_refund_id if it's a Stripe refund
                $paymentMethod = $order->payment_method;
                if (! $paymentMethod) {
                    // Try to detect from refund result
                    $paymentMethod = isset($refundResult['points_refunded']) ? 'believe_points' : 'stripe';
                }

                if ($paymentMethod === 'stripe' && isset($refundResult['refund_id'])) {
                    $updateData['stripe_refund_id'] = $refundResult['refund_id'];
                }

                $order->update($updateData);

                \Log::info('Order cancelled and refund processed successfully', [
                    'order_id' => $order->id,
                    'payment_method' => $paymentMethod,
                    'refund_result' => $refundResult,
                ]);

                return redirect()->back()->with([
                    'success' => true,
                    'message' => 'Order cancelled and refund processed successfully',
                ]);
            }

            \Log::warning('Printify cancellation response status not recognized', [
                'order_id' => $order->id,
                'response_status' => $cancelResponse['status'] ?? 'not_set',
                'response' => $cancelResponse,
            ]);

            return redirect()->back()->withErrors([
                'error' => 'Failed to cancel order in Printify. Unexpected response status.',
            ]);

        } catch (\Exception $e) {
            \Log::error('Error cancelling Printify order: '.$e->getMessage(), [
                'order_id' => $order->id,
                'exception' => $e,
            ]);

            return redirect()->back()->withErrors([
                'error' => 'Failed to cancel order: '.$e->getMessage(),
            ]);
        }
    }

    /**
     * Process refund for an order (Stripe or Believe Points)
     */
    private function processRefund(Order $order)
    {
        try {
            // Check if refund was already processed
            if ($order->payment_status === 'refunded') {
                return [
                    'success' => false,
                    'message' => 'Refund already processed for this order',
                ];
            }

            // Determine payment method
            $paymentMethod = $order->payment_method;

            // If payment_method is not set, try to detect from transaction records or Stripe payment intent
            if (! $paymentMethod) {
                // First, check if Stripe payment intent exists
                if ($order->stripe_payment_intent_id) {
                    $paymentMethod = 'stripe';
                } else {
                    // No Stripe payment intent, check transaction records
                    $transaction = \App\Models\Transaction::where('related_id', $order->id)
                        ->where('related_type', \App\Models\Order::class)
                        ->where('type', 'purchase')
                        ->first();

                    if ($transaction && $transaction->payment_method) {
                        $paymentMethod = $transaction->payment_method;
                    } else {
                        // No Stripe payment intent and no transaction record with payment_method
                        // Assume it's Believe Points (for backward compatibility with old orders)
                        $paymentMethod = 'believe_points';
                        \Log::info('Payment method not found, defaulting to Believe Points', [
                            'order_id' => $order->id,
                            'has_stripe_intent' => ! empty($order->stripe_payment_intent_id),
                            'has_transaction' => ! empty($transaction),
                        ]);
                    }
                }
            }

            \Log::info('Processing refund with detected payment method', [
                'order_id' => $order->id,
                'payment_method' => $paymentMethod,
                'has_stripe_intent' => ! empty($order->stripe_payment_intent_id),
            ]);

            // Handle Believe Points refund
            if ($paymentMethod === 'believe_points') {
                \Log::info('Processing Believe Points refund', [
                    'order_id' => $order->id,
                    'user_id' => $order->user_id,
                    'amount' => $order->total_amount,
                ]);

                $user = $order->user;
                if (! $user) {
                    return [
                        'success' => false,
                        'message' => 'User not found for this order',
                    ];
                }

                // Refund points back to user's balance
                $pointsToRefund = $order->total_amount; // 1$ = 1 believe point
                $user->increment('believe_points', $pointsToRefund);

                \Log::info('Believe Points refunded', [
                    'order_id' => $order->id,
                    'user_id' => $user->id,
                    'points_refunded' => $pointsToRefund,
                    'new_balance' => $user->believe_points,
                ]);

                // Create transaction record for refund
                \App\Models\Transaction::record([
                    'user_id' => $user->id,
                    'related_id' => $order->id,
                    'related_type' => \App\Models\Order::class,
                    'type' => 'refund',
                    'status' => \App\Models\Transaction::STATUS_COMPLETED,
                    'amount' => $order->total_amount,
                    'fee' => 0,
                    'currency' => 'USD',
                    'payment_method' => 'believe_points',
                    'meta' => [
                        'order_id' => $order->id,
                        'believe_points_refunded' => $pointsToRefund,
                        'refund_reason' => 'order_cancelled',
                    ],
                    'processed_at' => now(),
                ]);

                return [
                    'success' => true,
                    'message' => 'Believe Points refund processed successfully',
                    'refund_id' => 'believe_points_refund_'.$order->id,
                    'refund_status' => 'succeeded',
                    'refund_amount' => $order->total_amount,
                    'points_refunded' => $pointsToRefund,
                ];
            }

            // Handle Stripe refund
            if ($paymentMethod === 'stripe') {
                // Check if order has a Stripe payment intent
                if (! $order->stripe_payment_intent_id) {
                    return [
                        'success' => false,
                        'message' => 'No Stripe payment intent found for this order',
                    ];
                }

                \Log::info('Processing Stripe refund', [
                    'order_id' => $order->id,
                    'payment_intent_id' => $order->stripe_payment_intent_id,
                    'amount' => $order->total_amount,
                ]);

                // Create refund using Stripe via Cashier
                $stripe = \Laravel\Cashier\Cashier::stripe();
                $refund = $stripe->refunds->create([
                    'payment_intent' => $order->stripe_payment_intent_id,
                    'amount' => (int) ($order->total_amount * 100), // Convert to cents
                    'reason' => 'requested_by_customer',
                ]);

                // Check refund status
                if ($refund->status === 'succeeded' || $refund->status === 'pending') {
                    \Log::info('Stripe refund successful', [
                        'order_id' => $order->id,
                        'refund_id' => $refund->id,
                        'refund_status' => $refund->status,
                    ]);

                    return [
                        'success' => true,
                        'message' => 'Stripe refund processed successfully',
                        'refund_id' => $refund->id,
                        'refund_status' => $refund->status,
                        'refund_amount' => $refund->amount / 100, // Convert back from cents
                    ];
                } else {
                    return [
                        'success' => false,
                        'message' => 'Refund failed with status: '.$refund->status,
                    ];
                }
            }

            return [
                'success' => false,
                'message' => 'Unknown payment method: '.$paymentMethod,
            ];

        } catch (\Stripe\Exception\ApiErrorException $e) {
            \Log::error('Stripe refund error: '.$e->getMessage());

            return [
                'success' => false,
                'message' => 'Stripe API error: '.$e->getMessage(),
            ];
        } catch (\Exception $e) {
            \Log::error('Refund processing error: '.$e->getMessage());

            return [
                'success' => false,
                'message' => 'Refund processing error: '.$e->getMessage(),
            ];
        }
    }

    /**
     * Format Printify order data for frontend
     */
    private function formatPrintifyOrderData(array $printifyOrder): array
    {
        return [
            'id' => $printifyOrder['id'] ?? null,
            'status' => $printifyOrder['status'] ?? null,
            'total_price' => isset($printifyOrder['total_price']) ? $printifyOrder['total_price'] / 100 : 0,
            'total_shipping' => isset($printifyOrder['total_shipping']) ? $printifyOrder['total_shipping'] / 100 : 0,
            'total_tax' => isset($printifyOrder['total_tax']) ? $printifyOrder['total_tax'] / 100 : 0,
            'shipping_method' => $printifyOrder['shipping_method'] ?? null,
            'created_at' => $printifyOrder['created_at'] ?? null,
            'line_items' => array_map(function ($item) {
                return [
                    'id' => $item['id'] ?? null,
                    'quantity' => $item['quantity'] ?? 0,
                    'product_id' => $item['product_id'] ?? null,
                    'variant_id' => $item['variant_id'] ?? null,
                    'print_provider_id' => $item['print_provider_id'] ?? null,
                    'shipping_cost' => isset($item['shipping_cost']) ? $item['shipping_cost'] / 100 : 0,
                    'cost' => isset($item['cost']) ? $item['cost'] / 100 : 0,
                    'status' => $item['status'] ?? null,
                    'metadata' => $item['metadata'] ?? [],
                    'product_image' => $this->getProductImage($item['product_id'] ?? null, $item['variant_id'] ?? null),
                ];
            }, $printifyOrder['line_items'] ?? []),
            'address_to' => $printifyOrder['address_to'] ?? null,
            'fulfilment_type' => $printifyOrder['fulfilment_type'] ?? null,
        ];
    }

    /**
     * Get product image from Printify
     */
    private function getProductImage(?string $productId, ?string $variantId): ?string
    {
        if (! $productId) {
            return null;
        }

        try {
            $product = $this->printifyService->getProduct($productId);
            $images = $product['images'] ?? [];

            // Find image for this variant
            foreach ($images as $image) {
                if (in_array($variantId, $image['variant_ids'] ?? [])) {
                    return $image['src'] ?? null;
                }
            }

            // Return first image if no variant-specific image found
            return $images[0]['src'] ?? null;
        } catch (\Exception $e) {
            \Log::error('Error fetching product image: '.$e->getMessage());

            return null;
        }
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Order $order)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Order $order)
    {
        $validated = $request->validate([
            'status' => 'required|in:processing,shipped,delivered,cancelled,refunded',
        ]);

        // Prevent status change if order is already cancelled
        if ($order->status === 'cancelled' || $order->status === 'refunded') {
            return response()->json([
                'success' => false,
                'message' => 'Cannot change status of a cancelled or refunded order.',
            ], 403);
        }

        // Check if this is a manual product order (not Printify)
        $isManualOrder = empty($order->printify_order_id);

        if (! $isManualOrder) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot manually update status for Printify orders. Status is managed by Printify.',
            ], 403);
        }

        // Check if order has any manual products
        $hasManualProduct = $this->orderHasManualOrPoolItem($order);

        if (! $hasManualProduct) {
            return response()->json([
                'success' => false,
                'message' => 'This order does not contain manual products.',
            ], 403);
        }

        // If status is being changed to cancelled, process refund
        if ($validated['status'] === 'cancelled' && $order->status !== 'cancelled') {
            try {
                DB::beginTransaction();

                // Process refund based on payment method
                $refundResult = $this->processRefund($order);

                if (! $refundResult['success']) {
                    DB::rollBack();

                    return response()->json([
                        'success' => false,
                        'message' => 'Failed to process refund: '.$refundResult['message'],
                    ], 400);
                }

                // Update order status and payment status
                $updateData = [
                    'status' => 'cancelled',
                    'payment_status' => 'refunded',
                    'refunded_at' => now(),
                ];

                // Store refund ID if it's a Stripe refund
                if (isset($refundResult['refund_id']) && strpos($refundResult['refund_id'], 'stripe') === false) {
                    $updateData['stripe_refund_id'] = $refundResult['refund_id'];
                }

                $order->update($updateData);

                // Restore product inventory
                foreach ($order->items as $item) {
                    $product = $item->product;
                    if ($product) {
                        $product->update([
                            'quantity_ordered' => max(0, $product->quantity_ordered - $item->quantity),
                            'quantity_available' => $product->quantity_available + $item->quantity,
                        ]);
                    }
                }

                DB::commit();

                \Log::info('Manual product order cancelled and refund processed', [
                    'order_id' => $order->id,
                    'refund_result' => $refundResult,
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Order cancelled and refund processed successfully',
                    'order' => $order->fresh(),
                    'refund' => $refundResult,
                ]);

            } catch (\Exception $e) {
                DB::rollBack();
                \Log::error('Error cancelling order and processing refund: '.$e->getMessage());

                return response()->json([
                    'success' => false,
                    'message' => 'Failed to cancel order: '.$e->getMessage(),
                ], 500);
            }
        }

        // For other status changes (not cancelled)
        $order->update([
            'status' => $validated['status'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Order status updated successfully',
            'order' => $order->fresh(),
        ]);
    }

    /**
     * Revenue share for a line tied to a Merchant Hub marketplace product (pool, direct hub, or org catalog sourced from MP).
     * Uses the same cent split rules as checkout.
     *
     * @return array{
     *     line_subtotal: float,
     *     pct_merchant: float,
     *     pct_organization: float,
     *     pct_biu: float,
     *     amount_merchant: float,
     *     amount_organization: float,
     *     amount_biu: float,
     *     nonprofit_split_enabled: bool,
     *     merchant_name: ?string,
     *     marketplace_product_name: string
     * }|null
     */
    private function merchantHubRevenueSplitForItem(OrderItem $item): ?array
    {
        $mp = null;
        if ($item->marketplace_product_id) {
            $mp = $item->marketplaceProduct;
        }
        if (! $mp && $item->organization_product_id) {
            $mp = $item->organizationProduct?->marketplaceProduct;
        }
        if (! $mp && $item->product_id && $item->product?->marketplace_product_id) {
            $mp = $item->product->sourceMarketplaceProduct;
        }
        if (! $mp) {
            return null;
        }
        $mp->loadMissing('merchant');

        $lineSubtotal = (float) $item->subtotal;
        $lineCents = (int) round($lineSubtotal * 100);
        $pctMRaw = (float) ($mp->pct_merchant ?? 0);
        $pctNRaw = (float) ($mp->pct_nonprofit ?? 0);
        $useNonprofitSplit = $mp->nonprofit_marketplace_enabled
            && abs($pctMRaw + $pctNRaw) > 0.01;
        if ($useNonprofitSplit) {
            $eff = MarketplacePoolRevenueSplit::effectivePercentages($pctMRaw, $pctNRaw);
            $allocated = MarketplacePoolRevenueSplit::allocateLineCents($lineCents, $pctMRaw, $pctNRaw);
            $mCents = $allocated['merchant_cents'];
            $nCents = $allocated['nonprofit_cents'];
            $bCents = 0;
            $pctMDisplay = $eff['pct_merchant'];
            $pctNDisplay = $eff['pct_nonprofit'];
        } else {
            $mCents = $lineCents;
            $nCents = 0;
            $bCents = 0;
            $pctMDisplay = 100.0;
            $pctNDisplay = 0.0;
        }

        $m = $mp->merchant;

        return [
            'line_subtotal' => round($lineSubtotal, 2),
            'pct_merchant' => round($useNonprofitSplit ? $pctMDisplay : 100.0, 2),
            'pct_organization' => round($useNonprofitSplit ? $pctNDisplay : 0.0, 2),
            'pct_biu' => 0.0,
            'amount_merchant' => round($mCents / 100, 2),
            'amount_organization' => round($nCents / 100, 2),
            'amount_biu' => round($bCents / 100, 2),
            'nonprofit_split_enabled' => $useNonprofitSplit,
            'merchant_name' => $m ? (string) ($m->business_name ?: $m->name) : null,
            'marketplace_product_name' => (string) $mp->name,
        ];
    }

    /**
     * @return array{line_subtotal: float, organization: float, merchant: float, biu: float}|null
     */
    private function merchantHubOrderSummary(Order $order): ?array
    {
        $org = 0.0;
        $mer = 0.0;
        $biu = 0.0;
        $sub = 0.0;
        foreach ($order->items as $item) {
            $row = $this->merchantHubRevenueSplitForItem($item);
            if ($row === null) {
                continue;
            }
            $org += $row['amount_organization'];
            $mer += $row['amount_merchant'];
            $biu += $row['amount_biu'];
            $sub += $row['line_subtotal'];
        }
        if ($sub <= 0) {
            return null;
        }

        return [
            'line_subtotal' => round($sub, 2),
            'organization' => round($org, 2),
            'merchant' => round($mer, 2),
            'biu' => round($biu, 2),
        ];
    }

    /**
     * @return array{name: string, description: string, image: ?string, printify_product_id: ?string, is_manual_product: bool}
     */
    private function orderItemDisplayLine(OrderItem $item): array
    {
        $p = $item->product;
        $mp = $item->marketplaceProduct ?? $item->organizationProduct?->marketplaceProduct;
        $details = is_array($item->product_details) ? $item->product_details : [];
        $name = $p?->name ?? ($details['name'] ?? null) ?? $mp?->name ?? 'Product';
        $description = $p?->description ?? $mp?->description ?? '';
        $image = $p?->image ?? $item->primary_image;
        if ($image === null && $mp && is_array($mp->images) && count($mp->images) > 0) {
            $image = $mp->images[0];
        }
        $printifyId = $p?->printify_product_id;
        $isManual = $item->marketplace_product_id || $item->organization_product_id
            ? true
            : ($p && empty($p->printify_product_id));

        return [
            'name' => $name,
            'description' => $description,
            'image' => $image,
            'printify_product_id' => $printifyId,
            'is_manual_product' => $isManual,
        ];
    }

    /**
     * Manual org catalog (no Printify) or merchant pool line (organization_product).
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

    /**
     * Safely get variant data from JSON
     */
    private function getVariantData($variantDataJson)
    {
        if (empty($variantDataJson)) {
            return null;
        }

        $decoded = json_decode($variantDataJson, true);

        if (is_array($decoded) && isset($decoded['size'])) {
            return $decoded['size'];
        } elseif (is_object($decoded) && isset($decoded->size)) {
            return $decoded->size;
        }

        return null;
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Order $order)
    {
        //
    }
}
