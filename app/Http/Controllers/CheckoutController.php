<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\OrderShippingInfo;
use App\Models\TempOrder;
use App\Models\Transaction;
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
     * Show checkout page - Step 1
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

        $subtotal = $cart->getTotal();
        // Platform fee removed from customer payment - only organization pays it
        // Platform fee will be calculated separately for organization view

        return Inertia::render('Checkout/index', [
            'items' => $cart->items->map(function ($item) {
                return [
                    'id' => $item->id,
                    'quantity' => $item->quantity,
                    'unit_price' => (float) $item->unit_price,
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
            'subtotal' => (float) $subtotal,
            'platform_fee_percentage' => 0, // Platform fee removed from customer payment
            'platform_fee' => 0, // Platform fee removed from customer payment
            // 'donation_percentage' => config('printify.optional_donation_percentage', 10), // Commented out - removed donation for Printify products
            'donation_percentage' => 0, // Set to 0 to disable donation
            'stripePublishableKey' => config('services.stripe.key'),
        ]);
    }

    /**
     * Step 1: Submit shipping info and create Printify order
     */
    public function submitStep1(Request $request): JsonResponse
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
            // 'platform_fee' => 'required|numeric', // Removed - customers don't pay platform fee
            // 'donation_amount' => 'required|numeric', // Commented out - removed donation for Printify products
            'donation_amount' => 'nullable|numeric', // Made optional and will be set to 0
        ]);

        $user = auth()->user();
        $cart = $user->cart()->with(['items.product', 'items.variant'])->first();

        if (!$cart || $cart->items->isEmpty()) {
            return response()->json(['error' => 'Cart is empty'], 400);
        }

        DB::beginTransaction();
        try {
            $subtotal = $cart->getTotal();

            // Split full name
            $nameParts = explode(' ', $validated['name']);
            $firstName = $nameParts[0] ?? 'Customer';
            $lastName = count($nameParts) > 1 ? implode(' ', array_slice($nameParts, 1)) : '';

            // Create temp order
            // Platform fee removed from customer payment - only organization pays it
            $tempOrder = TempOrder::create([
                'user_id' => $user->id,
                'cart_id' => $cart->id,
                'first_name' => $firstName,
                'last_name' => $lastName,
                'email' => $validated['email'],
                'phone' => $validated['phone'],
                'shipping_address' => $validated['address'],
                'city' => $validated['city'],
                'state' => $validated['state'],
                'zip' => $validated['zip'],
                'country' => $validated['country'],
                'subtotal' => $subtotal,
                'platform_fee' => 0, // Platform fee removed - customers don't pay it
                // 'donation_amount' => $validated['donation_amount'], // Commented out - removed donation for Printify products
                'donation_amount' => 0, // Set to 0 - donation removed for Printify products
                'total_amount' => $subtotal, // Platform fee removed from customer total
                'status' => 'pending',
            ]);

            // Create Printify order
            $printifyOrderData = $this->preparePrintifyOrder($cart, $tempOrder);
            $printifyOrder = $this->printifyService->createOrder($printifyOrderData);

            if (!isset($printifyOrder['id'])) {
                throw new \Exception('Failed to create Printify order');
            }

            $tempOrder->update([
                'printify_order_id' => $printifyOrder['id'],
            ]);

            // Calculate shipping from Printify
            $shippingData = $this->calculateShippingFromPrintify(
                $printifyOrder['id'],
                $validated['country'],
                $validated['state'],
                $validated['city'],
                $validated['zip']
            );

            // Extract tax from Printify order if available
            $taxAmount = 0;
            if (isset($shippingData['total_tax'])) {
                $taxAmount = ($shippingData['total_tax'] ?? 0) / 100;
            }

            // Update temp order with shipping and tax
            // Platform fee removed from customer payment
            $tempOrder->update([
                'shipping_methods' => $shippingData['methods'] ?? [],
                'shipping_cost' => $shippingData['cost'] ?? 0,
                'tax_amount' => $taxAmount,
                'total_amount' => $subtotal + ($shippingData['cost'] ?? 0) + $taxAmount, // Platform fee removed from customer total
                'status' => 'shipping_calculated',
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'temp_order_id' => $tempOrder->id,
                'shipping_methods' => $shippingData['methods'] ?? [],
                'shipping_cost' => (float) ($shippingData['cost'] ?? 0),
                'tax_amount' => (float) $taxAmount,
                'total_amount' => (float) $tempOrder->total_amount,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Step 1 submission error: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Step 2: Create payment intent
     */
    // public function createPaymentIntent(Request $request): JsonResponse
    // {
    //     $validated = $request->validate([
    //         'temp_order_id' => 'required|exists:temp_orders,id',
    //         'shipping_method' => 'required|string',
    //     ]);

    //     $user = auth()->user();
    //     $tempOrder = TempOrder::where('user_id', $user->id)
    //         ->findOrFail($validated['temp_order_id']);

    //     $printifyOrder = $this->printifyService->getOrder($tempOrder->printify_order_id);

    //     dd($printifyOrder);

    //     $newTaxAmount = $printifyOrder['total_tax'];

    //     $tempOrder->update([
    //             'tax_amount' => $newTaxAmount,
    //             'total_amount' => $tempOrder->total_amount + $newTaxAmount,
    //         ]);

    //     DB::beginTransaction();
    //     try {
    //         // Create Stripe payment intent
    //         $paymentIntent = PaymentIntent::create([
    //             'amount' => (int) ($tempOrder->total_amount * 100),
    //             'currency' => 'usd',
    //             'description' => 'Marketplace Order - ' . $user->email,
    //             'metadata' => [
    //                 'user_id' => $user->id,
    //                 'temp_order_id' => $tempOrder->id,
    //                 'order_type' => 'marketplace',
    //             ],
    //             'automatic_payment_methods' => [
    //                 'enabled' => true,
    //             ],
    //         ]);

    //         // Update temp order with selected shipping method
    //         $tempOrder->update([
    //             'selected_shipping_method' => $validated['shipping_method'],
    //         ]);

    //         DB::commit();

    //         return response()->json([
    //             'clientSecret' => $paymentIntent->client_secret,
    //             'temp_order_id' => $tempOrder->id,
    //             'amount' => (float) $tempOrder->total_amount,
    //         ]);
    //     } catch (\Exception $e) {
    //         DB::rollBack();
    //         \Log::error('Payment intent creation error: ' . $e->getMessage());
    //         return response()->json(['error' => $e->getMessage()], 500);
    //     }
    // }


    /**
     * Step 2: Create payment intent
     */
    // public function createPaymentIntent(Request $request): JsonResponse
    // {
    //     $validated = $request->validate([
    //         'temp_order_id' => 'required|exists:temp_orders,id',
    //         'shipping_method' => 'required|string',
    //     ]);

    //     $user = auth()->user();
    //     $tempOrder = TempOrder::where('user_id', $user->id)
    //         ->findOrFail($validated['temp_order_id']);

    //     // Always check Printify for latest tax before payment
    //     try {
    //         $printifyOrder = $this->printifyService->getOrder($tempOrder->printify_order_id);

    //         // Convert cents to dollars
    //         $newTaxAmount = (float) (($printifyOrder['total_tax'] ?? 0) / 100);
    //         $newShippingCost = (float) (($printifyOrder['total_shipping'] ?? 0) / 100);

    //         // Calculate new total
    //         $newTotalAmount = $tempOrder->subtotal +
    //             $tempOrder->platform_fee +
    //             $tempOrder->donation_amount +
    //             $newShippingCost +
    //             $newTaxAmount;

    //         // Update temp order with latest values
    //         $tempOrder->update([
    //             'tax_amount' => $newTaxAmount,
    //             'shipping_cost' => $newShippingCost,
    //             'total_amount' => $newTotalAmount,
    //             'selected_shipping_method' => $validated['shipping_method'],
    //         ]);

    //     } catch (\Exception $e) {
    //         \Log::error('Failed to get Printify tax update: ' . $e->getMessage());
    //         // Continue with existing values if Printify fails
    //     }

    //     DB::beginTransaction();
    //     try {
    //         // Create Stripe payment intent with UPDATED amount
    //         $paymentIntent = PaymentIntent::create([
    //             'amount' => (int) ($tempOrder->total_amount * 100),
    //             'currency' => 'usd',
    //             'description' => 'Marketplace Order - ' . $user->email,
    //             'metadata' => [
    //                 'user_id' => $user->id,
    //                 'temp_order_id' => $tempOrder->id,
    //                 'order_type' => 'marketplace',
    //             ],
    //             'automatic_payment_methods' => [
    //                 'enabled' => true,
    //             ],
    //         ]);

    //         DB::commit();

    //         return response()->json([
    //             'success' => true,
    //             'clientSecret' => $paymentIntent->client_secret,
    //             'temp_order_id' => $tempOrder->id,
    //             'amount' => (float) $tempOrder->total_amount,
    //             'tax_amount' => (float) $tempOrder->tax_amount,
    //             'shipping_cost' => (float) $tempOrder->shipping_cost,
    //         ]);
    //     } catch (\Exception $e) {
    //         DB::rollBack();
    //         \Log::error('Payment intent creation error: ' . $e->getMessage());
    //         return response()->json(['error' => $e->getMessage()], 500);
    //     }
    // }


    public function createPaymentIntent(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'temp_order_id' => 'required|exists:temp_orders,id',
            'shipping_method' => 'required|string',
        ]);

        $user = auth()->user();
        $tempOrder = TempOrder::where('user_id', $user->id)
            ->findOrFail($validated['temp_order_id']);

        $maxRetries = 5;
        $retryDelay = 2.5; // seconds
        $newTaxAmount = 0;
        $newShippingCost = 0;
        $printifyStatus = null;

        // Try to get Printify order with retry mechanism
        for ($attempt = 1; $attempt <= $maxRetries; $attempt++) {
            try {
                $printifyOrder = $this->printifyService->getOrder($tempOrder->printify_order_id);
                $printifyStatus = $printifyOrder['status'] ?? null;

                \Log::info('Printify order check attempt', [
                    'attempt' => $attempt,
                    'order_id' => $tempOrder->printify_order_id,
                    'status' => $printifyStatus,
                    'total_tax' => $printifyOrder['total_tax'] ?? 0,
                    'total_shipping' => $printifyOrder['total_shipping'] ?? 0,
                ]);

                // Convert cents to dollars
                $newTaxAmount = (float) (($printifyOrder['total_tax'] ?? 0) / 100);
                $newShippingCost = (float) (($printifyOrder['total_shipping'] ?? 0) / 100);

                // Check if tax is calculated (non-zero) or if status is ready
                $isTaxCalculated = $newTaxAmount > 0;
                $isStatusReady = in_array($printifyStatus, ['on-hold', 'pending', 'cost-calculation'])
                    ? false
                    : true;

                // If tax is calculated OR we've reached max retries, break
                if ($isTaxCalculated || $attempt === $maxRetries) {
                    break;
                }

                // Wait before retrying
                if ($attempt < $maxRetries) {
                    sleep($retryDelay);
                }

            } catch (\Exception $e) {
                \Log::error('Failed to get Printify order on attempt ' . $attempt . ': ' . $e->getMessage());

                // If this is the last attempt, use fallback
                if ($attempt === $maxRetries) {
                    $newTaxAmount = $this->estimateTaxFallback($tempOrder);
                    $newShippingCost = $tempOrder->shipping_cost;
                    \Log::warning('Using estimated tax after all retries failed');
                }
            }
        }

        // // If tax is still 0 after retries, use estimation
        // if ($newTaxAmount <= 0) {
        //     $newTaxAmount = $this->estimateTaxFallback($tempOrder);
        //     \Log::warning('Tax is 0 after retries, using estimated tax', [
        //         'estimated_tax' => $newTaxAmount,
        //         'printify_status' => $printifyStatus,
        //     ]);
        // }

        // Calculate new total (platform fee removed - customers don't pay it)
        $newTotalAmount = $tempOrder->subtotal +
            // $tempOrder->platform_fee + // Removed - customers don't pay platform fee
            // $tempOrder->donation_amount + // Commented out - removed donation for Printify products
            $newShippingCost +
            $newTaxAmount;

        // Log the calculated amounts
        \Log::info('Final amounts for payment intent', [
            'temp_order_id' => $tempOrder->id,
            'old_tax' => $tempOrder->tax_amount,
            'new_tax' => $newTaxAmount,
            'old_shipping' => $tempOrder->shipping_cost,
            'new_shipping' => $newShippingCost,
            'old_total' => $tempOrder->total_amount,
            'new_total' => $newTotalAmount,
            'printify_status' => $printifyStatus,
        ]);

        // Update temp order with latest values
        $tempOrder->update([
            'tax_amount' => $newTaxAmount,
            'shipping_cost' => $newShippingCost,
            'total_amount' => $newTotalAmount,
            'selected_shipping_method' => $validated['shipping_method'],
            'printify_status' => $printifyStatus,
        ]);

        DB::beginTransaction();
        try {
            // Create Stripe payment intent with UPDATED amount
            $paymentIntent = PaymentIntent::create([
                'amount' => (int) ($tempOrder->total_amount * 100),
                'currency' => 'usd',
                'description' => 'Marketplace Order - ' . $user->email,
                'metadata' => [
                    'user_id' => $user->id,
                    'temp_order_id' => $tempOrder->id,
                    'order_type' => 'marketplace',
                    'printify_status' => $printifyStatus,
                    'tax_calculated' => $newTaxAmount > 0 ? 'yes' : 'no',
                ],
                'automatic_payment_methods' => [
                    'enabled' => true,
                ],
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'clientSecret' => $paymentIntent->client_secret,
                'temp_order_id' => $tempOrder->id,
                'amount' => (float) $tempOrder->total_amount,
                'tax_amount' => (float) $tempOrder->tax_amount,
                'shipping_cost' => (float) $tempOrder->shipping_cost,
                'donation_amount' => (float) $tempOrder->donation_amount,
                'printify_status' => $printifyStatus,
                'tax_estimated' => $newTaxAmount <= 0, // Flag if tax was estimated
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Payment intent creation error: ' . $e->getMessage());
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Confirm payment and create final order
     */
    public function confirmPayment(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'temp_order_id' => 'required|exists:temp_orders,id',
            'payment_intent_id' => 'nullable|string',
            'payment_method' => 'nullable|string|in:stripe,believe_points',
        ]);

        $user = auth()->user();
        $tempOrder = TempOrder::where('user_id', $user->id)
            ->with('cart.items.product')
            ->findOrFail($validated['temp_order_id']);

        $paymentMethod = $validated['payment_method'] ?? 'stripe';
        $paymentIntent = null;

        DB::beginTransaction();
        try {
            // Handle Believe Points payment
            if ($paymentMethod === 'believe_points') {
                $pointsRequired = $tempOrder->total_amount; // 1$ = 1 believe point
                $user->refresh(); // Get latest balance

                if ($user->believe_points < $pointsRequired) {
                    DB::rollBack();
                    return response()->json([
                        'error' => "Insufficient Believe Points. You need {$pointsRequired} points but only have {$user->believe_points} points."
                    ], 400);
                }

                // Deduct points
                if (!$user->deductBelievePoints($pointsRequired)) {
                    DB::rollBack();
                    return response()->json([
                        'error' => 'Failed to deduct Believe Points. Please try again.'
                    ], 500);
                }
            } else {
                // Validate Stripe payment
                if (!isset($validated['payment_intent_id'])) {
                    return response()->json(['error' => 'Payment intent ID is required for Stripe payments'], 400);
                }

                $paymentIntent = PaymentIntent::retrieve($validated['payment_intent_id']);

                if ($paymentIntent->status !== 'succeeded') {
                    return response()->json(['error' => 'Payment not completed'], 400);
                }
            }

            // COMMENTED OUT: Donation calculation removed for Printify products
            // Calculate total donation amount from temp order
            // $totalDonationAmount = $tempOrder->donation_amount;

            // Calculate total subtotal for donation distribution
            // $totalSubtotal = $tempOrder->cart->items->sum(function ($item) {
            //     return $item->unit_price * $item->quantity;
            // });

            // Group cart items by organization to calculate donation distribution
            // $organizationItems = [];
            // foreach ($tempOrder->cart->items as $cartItem) {
            //     $orgId = $cartItem->product->organization_id;
            //     if (!isset($organizationItems[$orgId])) {
            //         $organizationItems[$orgId] = [
            //             'items' => [],
            //             'subtotal' => 0
            //         ];
            //     }
            //     $organizationItems[$orgId]['items'][] = $cartItem;
            //     $organizationItems[$orgId]['subtotal'] += $cartItem->unit_price * $cartItem->quantity;
            // }

            // Calculate donation percentage for each organization based on their subtotal share
            // $organizationDonations = [];
            // foreach ($organizationItems as $orgId => $orgData) {
            //     // Avoid division by zero
            //     if ($totalSubtotal > 0) {
            //         $orgSubtotalPercentage = ($orgData['subtotal'] / $totalSubtotal) * 100;
            //         $orgDonationAmount = ($totalDonationAmount * $orgSubtotalPercentage) / 100;
            //     } else {
            //         $orgSubtotalPercentage = 0;
            //         $orgDonationAmount = 0;
            //     }

            //     $organizationDonations[$orgId] = [
            //         'donation_amount' => $orgDonationAmount,
            //         'subtotal_percentage' => $orgSubtotalPercentage,
            //         'item_count' => count($orgData['items']),
            //         'org_subtotal' => $orgData['subtotal'] // Add this for safety
            //     ];
            // }

            // Set empty organization donations array since donation is disabled
            $organizationDonations = [];

            // Create final order
            $order = Order::create([
                'user_id' => $user->id,
                'organization_id' => $tempOrder->cart->items->first()->product->organization_id ?? null,
                'subtotal' => $tempOrder->subtotal,
                'platform_fee' => $tempOrder->platform_fee,
                // 'donation_amount' => $tempOrder->donation_amount, // Commented out - removed donation for Printify products
                'donation_amount' => 0, // Set to 0 - donation removed for Printify products
                'tax_amount' => $tempOrder->tax_amount,
                'shipping_cost' => $tempOrder->shipping_cost,
                'total_amount' => $tempOrder->total_amount,
                'status' => 'processing',
                'payment_status' => 'paid',
                'payment_method' => $paymentMethod,
                'paid_at' => now(),
                'stripe_payment_intent_id' => $paymentMethod === 'stripe' ? (isset($paymentIntent) ? $paymentIntent->id : null) : null,
                'printify_order_id' => $tempOrder->printify_order_id,
            ]);

            // Create shipping info
            OrderShippingInfo::create([
                'order_id' => $order->id,
                'first_name' => $tempOrder->first_name,
                'last_name' => $tempOrder->last_name,
                'email' => $tempOrder->email,
                'phone' => $tempOrder->phone,
                'shipping_address' => $tempOrder->shipping_address,
                'city' => $tempOrder->city,
                'state' => $tempOrder->state,
                'zip' => $tempOrder->zip,
                'country' => $tempOrder->country,
                'shipping_method' => $tempOrder->selected_shipping_method,
            ]);

            // Create order items from cart (donation removed for Printify products)
            foreach ($tempOrder->cart->items as $cartItem) {
                // COMMENTED OUT: Donation calculation removed for Printify products
                // $orgId = $cartItem->product->organization_id;
                // $orgDonationData = $organizationDonations[$orgId] ?? null;

                // Calculate donation per item for this organization
                $donationPerItem = 0; // Set to 0 - donation removed for Printify products

                // COMMENTED OUT: Donation distribution logic
                // // FIX: Check if orgDonationData exists and has required data
                // if (
                //     $orgDonationData &&
                //     isset($orgDonationData['donation_amount']) &&
                //     isset($orgDonationData['org_subtotal']) &&
                //     $orgDonationData['org_subtotal'] > 0 &&
                //     $orgDonationData['item_count'] > 0
                // ) {

                //     $itemSubtotal = $cartItem->unit_price * $cartItem->quantity;
                //     $itemPercentage = ($itemSubtotal / $orgDonationData['org_subtotal']) * 100;
                //     $donationPerItem = ($orgDonationData['donation_amount'] * $itemPercentage) / 100;

                //     // Ensure donation per item is not negative
                //     $donationPerItem = max(0, $donationPerItem);
                // }

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
                    'per_organization_donation_amount' => $donationPerItem,
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

            // COMMENTED OUT: Donation logging removed for Printify products
            // Log donation distribution for debugging
            // \Log::info('Donation distribution completed', [
            //     'order_id' => $order->id,
            //     'total_donation' => $totalDonationAmount,
            //     'total_subtotal' => $totalSubtotal,
            //     'organization_count' => count($organizationDonations),
            //     'organization_donations' => $organizationDonations
            // ]);

            // Create transaction record for Believe Points payment
            if ($paymentMethod === 'believe_points') {
                Transaction::record([
                    'user_id' => $user->id,
                    'related_id' => $order->id,
                    'related_type' => Order::class,
                    'type' => 'purchase',
                    'status' => Transaction::STATUS_COMPLETED,
                    'amount' => $tempOrder->total_amount,
                    'fee' => 0,
                    'currency' => 'USD',
                    'payment_method' => 'believe_points',
                    'meta' => [
                        'order_id' => $order->id,
                        'believe_points_used' => $pointsRequired,
                        'printify_order_id' => $tempOrder->printify_order_id,
                    ],
                    'processed_at' => now(),
                ]);
            }

            // Clear cart
            $tempOrder->cart->items()->delete();

            // Update temp order status
            $tempOrder->update(['status' => 'payment_completed']);

            DB::commit();

            return response()->json([
                'success' => true,
                'orderId' => $order->id,
                'redirect' => route('user.profile.orders'),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Payment confirmation error: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json(['error' => 'Failed to process payment: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Prepare Printify order data
     */
    private function preparePrintifyOrder(Cart $cart, TempOrder $tempOrder): array
    {
        $lineItems = [];

        foreach ($cart->items as $item) {
            if (!empty($item->product->printify_product_id)) {
                $lineItems[] = [
                    'product_id' => $item->product->printify_product_id,
                    'variant_id' => (int) $item->printify_variant_id,
                    'quantity' => $item->quantity,
                    'external_id' => 'temp-' . $tempOrder->id . '-item-' . $item->id,
                ];
            }
        }

        return [
            'external_id' => 'ORDER-' . $tempOrder->id . '-' . uniqid(),
            'label' => 'ORDER-LABEL' . $tempOrder->id,
            'line_items' => $lineItems,
            'address_to' => [
                'first_name' => $tempOrder->first_name,
                'last_name' => $tempOrder->last_name,
                'email' => $tempOrder->email,
                'phone' => $tempOrder->phone,
                'country' => $tempOrder->country,
                'region' => $tempOrder->state,
                'city' => $tempOrder->city,
                'address1' => $tempOrder->shipping_address,
                'zip' => $tempOrder->zip,
            ],
            'send_shipping_notification' => false,
        ];
    }

    /**
     * Calculate shipping from Printify
    */
    public function calculateShippingFromPrintify(
        string $printifyOrderId,
        string $country,
        string $state,
        string $city,
        string $zip
    ): array {
        try {
            // Get Printify order details
            $printifyOrder = $this->printifyService->getOrder($printifyOrderId);

            $methods = [];
            $defaultCost = 0;

            if (isset($printifyOrder['shipping_method'])) {
                $methods[] = [
                    'id' => 'standard',
                    'name' => 'Standard Shipping',
                    'cost' => (float) (($printifyOrder['shipping_method']['cost'] ?? 0) / 100),
                    'estimated_days' => '10-30 business days',
                ];
            }

            $defaultCost = (float) (($printifyOrder['total_shipping']?? 0) / 100);

            // Log donation distribution for debugging
            \Log::info('Printify order in checkout step1 submit', [
                'printifyOrder' => $printifyOrder,
            ]);

            return [
                'cost' => $defaultCost,
                'total_tax' => $printifyOrder['total_tax'],
                'methods' => $methods,
            ];


        } catch (\Exception $e) {
            \Log::error('Shipping calculation error: ' . $e->getMessage());
            return [
                'cost' => 9.99,
                'methods' => [
                    [
                        'id' => 'standard',
                        'name' => 'Standard Shipping',
                        'cost' => 9.99,
                        'estimated_days' => '10-30 business days',
                    ]
                ],
            ];
        }
    }



    /**
     * Update tax amount when Step2 page loads
     */
    public function updateTax(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'temp_order_id' => 'required|exists:temp_orders,id',
        ]);

        $user = auth()->user();
        $tempOrder = TempOrder::where('user_id', $user->id)
            ->findOrFail($validated['temp_order_id']);

        try {
            // Check if we have a Printify order ID
            if (!$tempOrder->printify_order_id) {
                return response()->json([
                    'success' => false,
                    'error' => 'No Printify order found',
                ], 400);
            }

            // Get updated Printify order details
            $printifyOrder = $this->printifyService->getOrder($tempOrder->printify_order_id);

            // Calculate new tax amount
            $newTaxAmount = (float) (($printifyOrder['total_tax'] ?? 0) / 100);
            $shippingCost = (float) (($printifyOrder['total_shipping'] ?? 0) / 100);

            // Log the tax update
            \Log::info('Tax amount updated on Step2 load', [
                'temp_order_id' => $tempOrder->id,
                'old_tax_amount' => $tempOrder->tax_amount,
                'new_tax_amount' => $newTaxAmount,
                'old_shipping_cost' => $tempOrder->shipping_cost,
                'new_shipping_cost' => $shippingCost,
                'printify_order_id' => $tempOrder->printify_order_id,
            ]);

            // Update temp order with new tax and shipping
            $oldTotal = $tempOrder->total_amount;

            $tempOrder->update([
                'tax_amount' => $newTaxAmount,
                'shipping_cost' => $shippingCost,
                'total_amount' => $tempOrder->subtotal +
                    $tempOrder->platform_fee +
                    // $tempOrder->donation_amount + // Commented out - removed donation for Printify products
                    $shippingCost +
                    $newTaxAmount,
            ]);

            // Check if total amount changed significantly
            $amountChanged = abs($oldTotal - $tempOrder->total_amount) > 0.01;

            return response()->json([
                'success' => true,
                'tax_amount' => (float) $newTaxAmount,
                'shipping_cost' => (float) $shippingCost,
                'total_amount' => (float) $tempOrder->total_amount,
                'amount_changed' => $amountChanged,
                'old_total' => (float) $oldTotal,
                'new_total' => (float) $tempOrder->total_amount,
                'difference' => (float) ($tempOrder->total_amount - $oldTotal),
            ]);

        } catch (\Exception $e) {
            \Log::error('Tax update error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Failed to update tax amount',
            ], 500);
        }
    }
}
