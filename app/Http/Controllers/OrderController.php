<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\User;
use App\Services\PrintifyService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Stripe\Refund;
use Stripe\Stripe;

class OrderController extends Controller
{
    protected $printifyService;

    public function __construct(PrintifyService $printifyService)
    {
        $this->printifyService = $printifyService;
        Stripe::setApiKey(config('services.stripe.secret'));
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
            $query->where(function($q) use ($search) {
                $q->where('reference_number', 'LIKE', "%{$search}%")
                  ->orWhereHas('user', function($q) use ($search) {
                      $q->where('name', 'LIKE', "%{$search}%")
                        ->orWhere('email', 'LIKE', "%{$search}%");
                  });
            });
        }

        $orders = $query->with(['user', 'shippingInfo'])
            ->orderBy('created_at', 'desc')
            ->paginate($perPage, ['*'], 'page', $page);

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
        ])->get();

        $itemsData = $items->map(function ($item) {
            return [
                'id' => $item->id,
                'order_id' => $item->order_id,
                'product_id' => $item->product_id,
                'organization_id' => $item->organization_id,
                'name' => $item->name,
                'quantity' => $item->quantity,
                'unit_price' => $item->unit_price,
                'subtotal' => $item->subtotal,
                'product' => $item->product ? [
                    'id' => $item->product->id,
                    'name' => $item->product->name,
                    'image' => $item->product->image,
                ] : null,
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
            ]
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
            'user',
            'shippingInfo',
            'items.product',
        ]);

        // Calculate order subtotal (products only)
        $orderSubtotal = $order->items->sum(function ($item) {
            return $item->unit_price * $item->quantity;
        });

        $orderData = [
            'id' => $order->id,
            'reference_number' => $order->reference_number,
            'total_amount' => $order->total_amount,
            'subtotal_amount' => $orderSubtotal, // Add subtotal
            'shipping_cost' => $order->shipping_cost,
            'tax_amount' => $order->tax_amount,
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
                return [
                    'id' => $item->id,
                    'product_id' => $item->product_id,
                    'name' => $item->product->name,
                    'description' => $item->product->description,
                    'image' => $item->product->image,
                    'printify_product_id' => $item->product->printify_product_id,
                    'quantity' => $item->quantity,
                    'unit_price' => $item->unit_price,
                    'total_price' => $item->subtotal,
                    'printify_variant_id' => $item->printify_variant_id,
                    'variant_data' => json_decode($item->variant_data)->size,
                ];
            }),
        ];

        // Get Printify order details if available
        if ($order->printify_order_id) {
            try {
                $printifyOrder = $this->printifyService->getOrder($order->printify_order_id);
                $orderData['printify_details'] = $this->formatPrintifyOrderData($printifyOrder);
            } catch (\Exception $e) {
                \Log::error('Error fetching Printify order: ' . $e->getMessage());
                $orderData['printify_details'] = null;
                $orderData['printify_error'] = $e->getMessage();
            }
        }

        return Inertia::render('orders/show', [
            'order' => $orderData,
            'userRole' => auth()->user()->role,
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

        if (!$order->printify_order_id) {
            return response()->json(['error' => 'No Printify order ID found.'], 400);
        }

        try {
            $cancelResponse = $this->printifyService->cancelOrder($order->printify_order_id);

            if (isset($cancelResponse['status']) && $cancelResponse['status'] === 'canceled') {
                // Process Stripe refund
                $refundResult = $this->processRefund($order);

                if (!$refundResult['success']) {
                    return response()->json([
                        'error' => 'Order cancelled in Printify but refund failed: ' . $refundResult['message']
                    ], 400);
                }

                // Update local order status
                $order->update([
                    'status' => 'cancelled',
                    'printify_status' => 'cancelled',
                    'payment_status' => 'refunded', // Update payment status
                    'refunded_at' => now(),
                    'stripe_refund_id' => $refundResult['refund_id'] ?? null
                ]);

                return redirect()->back()->with([
                    'success' => true,
                    'message' => 'Order cancelled and refund processed successfully',
                    'order' => $cancelResponse,
                    'refund' => $refundResult
                ]);
            }

            return response()->json([
                'error' => 'Failed to cancel order in Printify'
            ], 400);

        } catch (\Exception $e) {
            \Log::error('Error cancelling Printify order: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to cancel order: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Process Stripe refund for an order
     */
    private function processRefund(Order $order)
    {
        try {
            // Check if order has a Stripe payment intent
            if (!$order->stripe_payment_intent_id) {
                return [
                    'success' => false,
                    'message' => 'No Stripe payment intent found for this order'
                ];
            }

            // Check if refund was already processed
            if ($order->payment_status === 'refunded') {
                return [
                    'success' => false,
                    'message' => 'Refund already processed for this order'
                ];
            }


            // Create refund using Stripe
            $refund = Refund::create([
                'payment_intent' => $order->stripe_payment_intent_id,
                'amount' => $order->total_amount * 100, // Uncomment for partial refunds
                'reason' => 'requested_by_customer', // Optional: requested_by_customer, duplicate, fraudulent
            ]);


            // Check refund status
            if ($refund->status === 'succeeded' || $refund->status === 'pending') {
                return [
                    'success' => true,
                    'message' => 'Refund processed successfully',
                    'refund_id' => $refund->id,
                    'refund_status' => $refund->status,
                    'refund_amount' => $refund->amount / 100 // Convert back from cents
                ];
            } else {
                return [
                    'success' => false,
                    'message' => 'Refund failed with status: ' . $refund->status
                ];
            }

        } catch (\Stripe\Exception\ApiErrorException $e) {
            \Log::error('Stripe refund error: ' . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Stripe API error: ' . $e->getMessage()
            ];
        } catch (\Exception $e) {
            \Log::error('Refund processing error: ' . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Refund processing error: ' . $e->getMessage()
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
        if (!$productId) return null;

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
            \Log::error('Error fetching product image: ' . $e->getMessage());
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
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Order $order)
    {
        //
    }
}
