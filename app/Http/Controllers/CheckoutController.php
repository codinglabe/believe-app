<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\OrderShippingInfo;
use App\Services\PrintifyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Stripe\Stripe;
use Stripe\PaymentIntent;
use Illuminate\Support\Facades\DB;

class CheckoutController extends Controller
{
    protected $printifyService;

    public function __construct(PrintifyService $printifyService)
    {
        $this->printifyService = $printifyService;
        Stripe::setApiKey(config('services.stripe.secret'));
    }

    /**
     * Show checkout page
     */
    public function show(): Response
    {
        $user = auth()->user();
        $cart = $user->cart()->with([
            'items.product',
            'items.variant'
        ])->first();

        if (!$cart || $cart->items->isEmpty()) {
            return Inertia::render('Checkout/Empty');
        }

        // Calculate initial shipping cost
        $shippingCost = 0;
        $shippingMethods = [];

        try {
            $shippingData = $this->calculateShippingCost($cart, [
                'country' => 'US',
                'state' => '',
                'city' => '',
                'zip' => ''
            ]);
            $shippingCost = $shippingData['cost'] ?? 0;
            $shippingMethods = $shippingData['methods'] ?? [];
        } catch (\Exception $e) {
            \Log::error('Shipping calculation error: ' . $e->getMessage());
        }

        $subtotal = $cart->getTotal();
        $taxAmount = $this->calculateTax($subtotal);
        $totalAmount = $subtotal + $shippingCost + $taxAmount;

        return Inertia::render('Checkout/index', [
            'items' => $cart->items->map(function ($item) {
                return [
                    'id' => $item->id,
                    'quantity' => $item->quantity,
                    'unit_price' => $item->unit_price,
                    'variant_image' => $item->variant_image,
                    'product' => [
                        'name' => $item->product->name,
                    ],
                    'variant_data' => [
                        'printify_variant_id' => $item->printify_variant_id,
                        'printify_blueprint_id' => $item->printify_blueprint_id,
                        'printify_print_provider_id' => $item->printify_print_provider_id,
                        'variant_options' => $item->variant_options,
                    ]
                ];
            }),
            'subtotal' => $subtotal,
            'shipping_cost' => $shippingCost,
            'tax_amount' => $taxAmount,
            'total_amount' => $totalAmount,
            'shipping_methods' => $shippingMethods,
            'stripePublishableKey' => config('services.stripe.secret'),
        ]);
    }

    /**
     * Calculate shipping cost from Printify
     */
    public function calculateShipping(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'country' => 'required|string',
            'state' => 'required|string',
            'city' => 'required|string',
            'zip' => 'required|string',
        ]);

        $cart = auth()->user()->cart()->with('items')->first();

        if (!$cart || $cart->items->isEmpty()) {
            return response()->json(['error' => 'Cart is empty'], 400);
        }

        try {
            $shippingData = $this->calculateShippingCost($cart, $validated);

            return response()->json([
                'success' => true,
                'shipping_cost' => $shippingData['cost'],
                'shipping_methods' => $shippingData['methods'],
                'estimated_delivery' => $shippingData['estimated_delivery'] ?? '5-7 business days',
            ]);
        } catch (\Exception $e) {
            \Log::error('Shipping calculation error: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to calculate shipping cost',
                'fallback_cost' => 9.99
            ], 500);
        }
    }

    /**
     * Calculate shipping cost using Printify API
     */
    private function calculateShippingCost(Cart $cart, array $address): array
    {
        $lineItems = [];

        $externalIdCounter = 1;
        foreach ($cart->items as $item) {
            $externalId = 'line-item-' . $item->id . '-' . $externalIdCounter++;

            // Method 1: Using product_id and variant_id (Primary method)
            if (!empty($item->product->printify_product_id)) {
                $lineItems[] = [
                    'product_id' => $item->product->printify_product_id,
                    'variant_id' => (int) $item->printify_variant_id,
                    'quantity' => $item->quantity,
                    'external_id' => $externalId
                ];
            }

            // Method 2: Using print_provider_id and blueprint_id (Fallback method)
            else if (!empty($item->printify_print_provider_id) && !empty($item->printify_blueprint_id)) {
                $lineItems[] = [
                    'print_provider_id' => $item->printify_print_provider_id,
                    'blueprint_id' => $item->printify_blueprint_id,
                    'variant_id' => (int) $item->printify_variant_id,
                    'quantity' => $item->quantity,
                    'external_id' => $externalId
                ];
            }

            // Method 3: Using SKU (Last resort)
            else if (!empty($item->product->sku)) {
                $lineItems[] = [
                    'sku' => $item->product->sku,
                    'quantity' => $item->quantity,
                    'external_id' => $externalId
                ];
            }
        }

        // Call Printify shipping calculation API
        $shippingQuote = $this->printifyService->calculateShipping(
            $lineItems,
            $address
        );

        // Default fallback
            return [
                'cost' => ($shippingQuote['standard'] / 100) ?? 9.99,
                'methods' => [
                    [
                        'id' => 'standard',
                        'name' => 'Standard Shipping',
                        'cost' => ($shippingQuote['standard'] / 100) ?? 9.99,
                        'estimated_days' => '10-30 business days'
                    ]
                ],
                'estimated_delivery' => '10-30 business days'
            ];
    }

    /**
     * Calculate tax amount (simplified)
     */
    private function calculateTax(float $subtotal): float
    {
        // Simplified tax calculation - you can implement proper tax calculation
        return $subtotal * (config('printify.tax_rate_percentage') / 100);
    }

    /**
     * Create payment intent
     */
    public function createPaymentIntent(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'email' => 'required|email',
            'phone' => 'required|string|max:20',
            'address' => 'required|string',
            'city' => 'required|string',
            'state' => 'required|string',
            'zip' => 'required|string',
            'country' => 'required|string',
            'shipping_method' => 'required|string',
        ]);

        $user = auth()->user();
        $cart = $user->cart()->with(['items.product', 'items.variant'])->first();

        if (!$cart || $cart->items->isEmpty()) {
            return response()->json(['error' => 'Cart is empty'], 400);
        }

        DB::beginTransaction();
        try {
            // Calculate final costs
            $shippingData = $this->calculateShippingCost($cart, $validated);
            $shippingCost = $shippingData['cost'];
            $subtotal = $cart->getTotal();
            $taxAmount = $this->calculateTax($subtotal);
            $totalAmount = $subtotal + $shippingCost + $taxAmount;

            // Create payment intent
            $paymentIntent = PaymentIntent::create([
                'amount' => (int) ($totalAmount * 100), // Convert to cents
                'currency' => 'usd',
                'description' => 'Marketplace Order - ' . $user->email,
                'metadata' => [
                    'user_id' => $user->id,
                    'order_type' => 'marketplace',
                ],
                'automatic_payment_methods' => [
                    'enabled' => true,
                ],
            ]);

            // Create order record
            $order = Order::create([
                'user_id' => $user->id,
                'organization_id' => $cart->items->first()->product->organization_id,
                'subtotal' => round($subtotal, 2),
                'tax_amount' => round($taxAmount, 2),
                'shipping_cost' => round($shippingCost, 2),
                'total_amount' => round($totalAmount, 2),
                'status' => 'pending',
                'stripe_payment_intent_id' => $paymentIntent->id,
                // 'shipping_info' => json_encode($validated),
                // 'shipping_method' => $validated['shipping_method'],
            ]);

            // Split full name into first and last name
            $fullName = $validated['name'];
            $nameParts = explode(' ', $fullName);
            $firstName = $nameParts[0] ?? 'Customer';
            $lastName = count($nameParts) > 1 ? implode(' ', array_slice($nameParts, 1)) : '';

            OrderShippingInfo::create([
                'order_id' => $order->id,
                'first_name' => $firstName,
                'last_name' => $lastName,
                'email' => $validated['email'],
                'phone' => $validated['phone'] ?? null,
                'shipping_address' => $validated['address'],
                'city' => $validated['city'],
                'state' => $validated['state'],
                'zip' => $validated['zip'],
                'country' => $validated['country'],
            ]);

            // Create order items from cart
            foreach ($cart->items as $cartItem) {
                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $cartItem->product_id,
                    'organization_id' => $cartItem->product->organization_id,
                    'printify_product_id' => $cartItem->product->printify_product_id,
                    'printify_variant_id' => $cartItem->printify_variant_id,
                    'printify_blueprint_id' => $cartItem->printify_blueprint_id,
                    'printify_print_provider_id' => $cartItem->printify_print_provider_id,
                    'quantity' => $cartItem->quantity,
                    'unit_price' => $cartItem->unit_price,
                    'subtotal' => $cartItem->unit_price * $cartItem->quantity,
                    'variant_data' => $cartItem->variant_options,
                    'primary_image' => $cartItem->variant_image,
                ]);

                // Update product inventory
                $product = $cartItem->product;
                $product->update([
                    'quantity_ordered' => $product->quantity_ordered + $cartItem->quantity,
                    'quantity_available' => $product->quantity_available - $cartItem->quantity,
                ]);
            }


            DB::commit();

            return response()->json([
                'clientSecret' => $paymentIntent->client_secret,
                'orderId' => $order->id,
                'amount' => $totalAmount,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Payment intent creation error: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to create payment intent: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Confirm payment and submit to Printify
     */
    public function confirmPayment(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'order_id' => 'required|exists:orders,id',
            'payment_intent_id' => 'required|string',
        ]);

        DB::beginTransaction();
        try {
            $order = Order::with('items.product', 'shippingInfo')->findOrFail($validated['order_id']);
            $paymentIntent = PaymentIntent::retrieve($validated['payment_intent_id']);

            if ($paymentIntent->status === 'succeeded') {
                // Mark order as paid
                $order->update([
                    'payment_status' => 'paid',
                    'paid_at' => now(),
                ]);

                // Submit order to Printify
                $printifyOrderId = $this->submitToPrintify($order);

                if ($printifyOrderId) {
                    $order->update([
                        'printify_order_id' => $printifyOrderId,
                        'status' => 'processing',
                        'printify_status' => 'pending'
                    ]);
                }

                // Clear user's cart
                auth()->user()->cart()->first()?->items()->delete();

                DB::commit();

                return response()->json([
                    'success' => true,
                    'orderId' => $order->id,
                    'printifyOrderId' => $printifyOrderId,
                    'redirect' => route('user.profile.orders'),
                ]);
            }

            DB::rollBack();
            return response()->json(['error' => 'Payment not completed'], 400);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Payment confirmation error: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Submit order to Printify
     */
    private function submitToPrintify(Order $order): ?string
    {
        try {
            $lineItems = [];

            foreach ($order->items as $item) {
                $lineItems[] = [
                    'product_id' => $item->product->printify_product_id,
                    'variant_id' => $item->printify_variant_id,
                    'quantity' => $item->quantity,
                    'external_id' => 'order-' . $order->id . '-item-' . $item->id,
                ];
            }

            $shippingInfo = $order->shippingInfo;

            $printifyOrder = $this->printifyService->createOrder([
                'external_id' => 'order-' . $order->id . '-' . uniqid(),
                'label' => 'ORDER-' . $order->id . '-' . uniqid(),
                'line_items' => $lineItems,
                'address_to' => [
                    'first_name' => $shippingInfo->first_name ?? '',
                    'last_name' => $shippingInfo->first_name ?? '',
                    'email' => $shippingInfo->email ?? '',
                    'phone' => $shippingInfo->phone ?? '',
                    'country' => $shippingInfo->country ?? '',
                    'region' => $shippingInfo->state ?? '',
                    'city' => $shippingInfo->city ?? '',
                    'address1' => $shippingInfo->shipping_address ?? '',
                    'address2' => $shippingInfo->shipping_address,
                    'zip' => $shippingInfo->zip ?? '',
                ],
                'shipping_method' => 1, // Assuming standard shipping
                "send_shipping_notification" => true,
            ]);

            return $printifyOrder['id'] ?? null;
        } catch (\Exception $e) {
            \Log::error('Printify order submission error: ' . $e->getMessage());
            return null;
        }
    }


    // private function submitToPrintify(Order $order): ?string
    // {
    //     try {
    //         $lineItems = [];

    //         foreach ($order->items as $item) {


    //             // Check if required fields are present
    //             if (empty($item->product->printify_product_id) || empty($item->printify_variant_id)) {
    //                 \Log::error('Missing Printify data for item: ' . $item->id);
    //                 continue;
    //             }

    //             $lineItems[] = [
    //                 'product_id' => $item->product->printify_product_id,
    //                 'variant_id' => (int) $item->printify_variant_id, // Ensure it's integer
    //                 'quantity' => (int) $item->quantity, // Ensure it's integer
    //                 'external_id' => 'order-' . $order->id . '-item-' . $item->id,
    //             ];
    //         }

    //         // Check if we have valid line items
    //         if (empty($lineItems)) {
    //             \Log::error('No valid line items for Printify order: ' . $order->id);
    //             return null;
    //         }

    //         $shippingInfo = $order->shippingInfo;

    //         // Check if shipping info exists
    //         if (!$shippingInfo) {
    //             \Log::error('No shipping info found for order: ' . $order->id);
    //             return null;
    //         }


    //         // Fix: You had $shippingInfo->first_name for last_name
    //         $addressTo = [
    //             'first_name' => $shippingInfo->first_name ?? '',
    //             'last_name' => $shippingInfo->last_name ?? '', // Fixed this line
    //             'email' => $shippingInfo->email ?? '',
    //             'phone' => $shippingInfo->phone ?? '',
    //             'country' => $shippingInfo->country ?? 'US', // Convert country code
    //             'region' => $shippingInfo->state ?? '',
    //             'city' => $shippingInfo->city ?? '',
    //             'address1' => $shippingInfo->shipping_address ?? '', // Fixed field name
    //             'address2' => '',
    //             'zip' => $shippingInfo->zip ?? '',
    //         ];

    //         $printifyData = [
    //             'external_id' => 'order-' . $order->id . '-' . uniqid(),
    //             'label' => 'ORDER-' . $order->id,
    //             'line_items' => $lineItems,
    //             'address_to' => $addressTo,
    //             'shipping_method' => 1,
    //             'send_shipping_notification' => true,
    //             'is_printify_express' => false,
    //             'is_economy_shipping' => false,
    //         ];


    //         $printifyOrder = $this->printifyService->createOrder($printifyData);


    //         return $printifyOrder['id'] ?? null;

    //     } catch (\Exception $e) {
    //         \Log::error('Printify order submission error for order ' . $order->id . ': ' . $e->getMessage());
    //         \Log::error('Stack trace: ' . $e->getTraceAsString());
    //         return null;
    //     }
    // }

    /**
     * Manual Printify submission for failed attempts
     */
    public function submitToPrintifyManual(Order $order): JsonResponse
    {
        try {
            $printifyOrderId = $this->submitToPrintify($order);

            if ($printifyOrderId) {
                $order->update([
                    'printify_order_id' => $printifyOrderId,
                    'status' => 'processing',
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Order submitted to Printify successfully',
                    'printify_order_id' => $printifyOrderId,
                ]);
            }

            return response()->json(['error' => 'Failed to submit order to Printify'], 500);
        } catch (\Exception $e) {
            \Log::error('Manual Printify submission error: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
