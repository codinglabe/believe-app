<?php

namespace App\Http\Controllers;

use App\Models\Cart;
use App\Models\MarketplaceProduct;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderShippingInfo;
use App\Models\OrderSplit;
use App\Models\ShippoShipment;
use App\Models\TempOrder;
use App\Models\Transaction;
use App\Services\MarketplaceOrderLedgerService;
use App\Services\PrintifyService;
use App\Services\ShippoService;
use App\Services\StripeConfigService;
use App\Services\SupporterActivityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Stripe\PaymentIntent;
use Stripe\Stripe;

class CheckoutController extends Controller
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
     * Show checkout page - Step 1
     */
    public function show(): Response
    {
        $user = auth()->user();
        $cart = $user->cart()->with([
            'items.product',
            'items.variant',
            'items.marketplaceProduct.merchant',
            'items.organizationProduct.marketplaceProduct',
            'items.organizationProduct.organization',
        ])->first();

        if (! $cart || $cart->items->isEmpty()) {
            return Inertia::render('Checkout/Empty');
        }

        $subtotal = $cart->getTotal();
        // Platform fee removed from customer payment - only organization pays it
        // Platform fee will be calculated separately for organization view

        return Inertia::render('Checkout/index', [
            'items' => $cart->items->map(function ($item) {
                if ($item->marketplace_product_id) {
                    $mp = $item->marketplaceProduct;

                    return [
                        'id' => $item->id,
                        'quantity' => $item->quantity,
                        'unit_price' => (float) $item->unit_price,
                        'variant_image' => $item->variant_image,
                        'product' => [
                            'name' => $mp?->name ?? 'Product',
                        ],
                        'variant_data' => [
                            'printify_variant_id' => null,
                            'printify_blueprint_id' => null,
                            'printify_print_provider_id' => null,
                            'variant_options' => null,
                        ],
                        'listing_type' => 'merchant_marketplace',
                        'sold_by_organization' => null,
                    ];
                }

                if ($item->organization_product_id) {
                    $mp = $item->organizationProduct?->marketplaceProduct;

                    return [
                        'id' => $item->id,
                        'quantity' => $item->quantity,
                        'unit_price' => (float) $item->unit_price,
                        'variant_image' => $item->variant_image,
                        'product' => [
                            'name' => $mp?->name ?? 'Product',
                        ],
                        'variant_data' => [
                            'printify_variant_id' => null,
                            'printify_blueprint_id' => null,
                            'printify_print_provider_id' => null,
                            'variant_options' => null,
                        ],
                        'listing_type' => 'merchant_pool',
                        'sold_by_organization' => $item->organizationProduct?->organization?->name,
                    ];
                }

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
                    ],
                    'listing_type' => 'catalog',
                ];
            }),
            'subtotal' => (float) $subtotal,
            'platform_fee_percentage' => 0, // Platform fee removed from customer payment
            'platform_fee' => 0, // Platform fee removed from customer payment
            // 'donation_percentage' => config('printify.optional_donation_percentage', 10), // Commented out - removed donation for Printify products
            'donation_percentage' => 0, // Set to 0 to disable donation
            // Prefer Stripe publishable key from database (payment_methods), fall back to .env
            'stripePublishableKey' => StripeConfigService::getPublishableKey() ?? config('services.stripe.key') ?? '',
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
        $cart = $user->cart()->with([
            'items.product',
            'items.variant',
            'items.marketplaceProduct.merchant',
            'items.organizationProduct.marketplaceProduct',
            'items.organizationProduct.organization',
        ])->first();

        if (! $cart || $cart->items->isEmpty()) {
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

            // Check if cart has Printify products (catalog products only)
            $hasPrintifyProducts = $cart->items->contains(function ($item) {
                return $item->product_id
                    && $item->product
                    && ! empty($item->product->printify_product_id);
            });

            $printifyOrderId = null;
            $shippingData = [];
            $taxAmount = 0;
            $shippoRateObjectId = null;
            $shippoCarrier = null;
            $shippoRateAmount = null;
            $shippoShipmentId = null;

            if ($hasPrintifyProducts) {
                // Create Printify order only if there are Printify products
                $printifyOrderData = $this->preparePrintifyOrder($cart, $tempOrder);

                // Only create order if there are Printify line items
                if (! empty($printifyOrderData['line_items'])) {
                    $printifyOrder = $this->printifyService->createOrder($printifyOrderData);

                    if (! isset($printifyOrder['id'])) {
                        throw new \Exception('Failed to create Printify order');
                    }

                    $printifyOrderId = $printifyOrder['id'];
                    $tempOrder->update([
                        'printify_order_id' => $printifyOrderId,
                    ]);

                    // Calculate shipping from Printify
                    $shippingData = $this->calculateShippingFromPrintify(
                        $printifyOrderId,
                        $validated['country'],
                        $validated['state'],
                        $validated['city'],
                        $validated['zip']
                    );

                    // Extract tax from Printify order if available
                    if (isset($shippingData['total_tax'])) {
                        $taxAmount = ($shippingData['total_tax'] ?? 0) / 100;
                    }
                } else {
                    // Cart has Printify products but no valid line items (fallback to manual shipping)
                    $defaultShippingCost = config('app.manual_product_shipping_cost', 9.99);
                    $shippingData = [
                        'cost' => $defaultShippingCost,
                        'methods' => [
                            [
                                'id' => 'standard',
                                'name' => 'Standard Shipping',
                                'cost' => $defaultShippingCost,
                                'estimated_days' => '5-10 business days',
                            ],
                        ],
                    ];
                }
            } else {
                // Manual org catalog, direct merchant marketplace, or pool listing: Shippo from seller ship-from
                $firstCartItem = $cart->items->first();
                $firstCartItem?->loadMissing([
                    'marketplaceProduct.merchant.shippingAddresses',
                    'organizationProduct.marketplaceProduct.merchant.shippingAddresses',
                ]);
                $mp = $firstCartItem?->marketplaceProduct ?? $firstCartItem?->organizationProduct?->marketplaceProduct;
                $poolOp = $firstCartItem?->organizationProduct;
                $merchant = $mp?->merchant;
                $manualProduct = $firstCartItem?->product;

                $shippingCost = (float) config('app.manual_product_shipping_cost', 9.99);
                $shippingMethods = [
                    [
                        'id' => 'standard',
                        'name' => 'Standard Shipping',
                        'cost' => $shippingCost,
                        'estimated_days' => '5-10 business days',
                    ],
                ];

                $canQuoteShippo = $this->shippoService->isConfigured()
                    && ! empty($validated['country'])
                    && ! empty($validated['zip']);

                $shipTo = [
                    'name' => trim(($firstName ?? 'Customer').' '.($lastName ?? '')),
                    'street1' => $validated['address'],
                    'city' => $validated['city'],
                    'state' => $validated['state'],
                    'zip' => $validated['zip'],
                    'country' => $this->shippoService->normalizeCountryToIso2((string) ($validated['country'] ?? 'US')),
                    'phone' => $this->shippoService->ensureRecipientPhoneForShippo($validated['phone'] ?? null),
                    'email' => $validated['email'],
                ];

                $defaultParcel = [
                    'length' => '10',
                    'width' => '8',
                    'height' => '4',
                    'distance_unit' => 'in',
                    'weight' => '16',
                    'mass_unit' => 'oz',
                ];

                if ($mp && $merchant && $mp->product_type === 'physical' && $canQuoteShippo) {
                    $shipFrom = $this->shippoService->shipFromPayloadForMerchant($merchant);
                    try {
                        $ratesResult = $this->shippoService->getRatesForAddresses($shipFrom, $shipTo, $defaultParcel);
                        if (! empty($ratesResult['success']) && ! empty($ratesResult['rates'])) {
                            $shippingMethods = $this->shippoService->ratesToCheckoutMethods($ratesResult['rates']);
                            if (! empty($shippingMethods)) {
                                $first = $shippingMethods[0];
                                $shippingCost = (float) $first['cost'];
                                $shippoRateObjectId = (string) $first['id'];
                                $shippoCarrier = $first['provider'] ?? null;
                                $shippoRateAmount = $shippingCost;
                                $shippoShipmentId = $ratesResult['shipment_id'] ?? null;
                            }
                        }
                    } catch (\Exception $e) {
                        $shippingCost = (float) config('app.manual_product_shipping_cost', 9.99);
                        $shippingMethods = [
                            [
                                'id' => 'standard',
                                'name' => 'Standard Shipping',
                                'cost' => $shippingCost,
                                'estimated_days' => '5-10 business days',
                            ],
                        ];
                        \Log::warning('Shippo rates failed in checkout step1 (merchant pool)', [
                            'error' => $e->getMessage(),
                        ]);
                    }
                } elseif ($manualProduct && $canQuoteShippo) {
                    $manualProduct->load(['organization.user', 'user', 'shipFromMerchant.shippingAddresses']);
                    $org = $manualProduct->organization;

                    $shipFrom = $this->shippoService->shipFromForManualProduct($manualProduct, $org);

                    $length = $manualProduct->parcel_length_in !== null ? (float) $manualProduct->parcel_length_in : 10.0;
                    $width = $manualProduct->parcel_width_in !== null ? (float) $manualProduct->parcel_width_in : 8.0;
                    $height = $manualProduct->parcel_height_in !== null ? (float) $manualProduct->parcel_height_in : 4.0;
                    $weight = $manualProduct->parcel_weight_oz !== null ? (float) $manualProduct->parcel_weight_oz : 16.0;
                    if ($weight < 0.1) {
                        $weight = 16.0;
                    }

                    $parcel = [
                        'length' => (string) $length,
                        'width' => (string) $width,
                        'height' => (string) $height,
                        'distance_unit' => 'in',
                        'weight' => (string) $weight,
                        'mass_unit' => 'oz',
                    ];

                    try {
                        $ratesResult = $this->shippoService->getRatesForAddresses($shipFrom, $shipTo, $parcel);
                        if (! empty($ratesResult['success']) && ! empty($ratesResult['rates'])) {
                            $shippingMethods = $this->shippoService->ratesToCheckoutMethods($ratesResult['rates']);
                            if (! empty($shippingMethods)) {
                                $first = $shippingMethods[0];
                                $shippingCost = (float) $first['cost'];
                                $shippoRateObjectId = (string) $first['id'];
                                $shippoCarrier = $first['provider'] ?? null;
                                $shippoRateAmount = $shippingCost;
                                $shippoShipmentId = $ratesResult['shipment_id'] ?? null;
                            }
                        }
                    } catch (\Exception $e) {
                        $shippingCost = (float) config('app.manual_product_shipping_cost', 9.99);
                        $shippingMethods = [
                            [
                                'id' => 'standard',
                                'name' => 'Standard Shipping',
                                'cost' => $shippingCost,
                                'estimated_days' => '5-10 business days',
                            ],
                        ];
                        \Log::warning('Shippo rates failed in checkout step1 (manual products)', [
                            'error' => $e->getMessage(),
                        ]);
                    }
                } elseif ($mp && $mp->product_type !== 'physical') {
                    $shippingCost = 0;
                    $shippingMethods = [
                        [
                            'id' => 'digital',
                            'name' => 'Digital / service delivery',
                            'cost' => 0,
                            'estimated_days' => '—',
                        ],
                    ];
                } else {
                    $shippingCost = (float) config('app.manual_product_shipping_cost', 9.99);
                    $shippingMethods = [
                        [
                            'id' => 'standard',
                            'name' => 'Standard Shipping',
                            'cost' => $shippingCost,
                            'estimated_days' => '5-10 business days',
                        ],
                    ];
                }

                $shippingData = [
                    'cost' => $shippingCost,
                    'methods' => $shippingMethods,
                ];

                if (! empty($validated['state'])) {
                    $stateCode = strtoupper($validated['state']);
                    $stateTax = \App\Models\StateSalesTax::where('state_code', $stateCode)->first();

                    if ($stateTax) {
                        $taxRate = (float) $stateTax->base_sales_tax_rate;
                        $subtotal = $cart->getTotal();
                        $taxAmount = ($subtotal * $taxRate) / 100;
                    }
                }
            }

            // Update temp order with shipping and tax
            // Platform fee removed from customer payment
            $tempOrder->update([
                'shipping_methods' => $shippingData['methods'] ?? [],
                'shipping_cost' => $shippingData['cost'] ?? 0,
                'tax_amount' => $taxAmount,
                'total_amount' => $subtotal + ($shippingData['cost'] ?? 0) + $taxAmount, // Platform fee removed from customer total
                'shippo_rate_object_id' => $shippoRateObjectId,
                'shippo_carrier' => $shippoCarrier,
                'shippo_rate_amount' => $shippoRateAmount,
                'shippo_shipment_id' => $shippoShipmentId,
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
            \Log::error('Step 1 submission error: '.$e->getMessage());

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
        $shippoPatch = [];

        // Check if this is a Printify order or manual product
        if ($tempOrder->printify_order_id) {
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
                    \Log::error('Failed to get Printify order on attempt '.$attempt.': '.$e->getMessage());

                    // If this is the last attempt, use fallback
                    if ($attempt === $maxRetries) {
                        $newTaxAmount = $this->estimateTaxFallback($tempOrder);
                        $newShippingCost = $tempOrder->shipping_cost;
                        \Log::warning('Using estimated tax after all retries failed');
                    }
                }
            }
        } else {
            // Manual products: tax from step 1; shipping from the method the buyer selected (Shippo rate id or flat "standard")
            $newTaxAmount = (float) ($tempOrder->tax_amount ?? 0);
            $methods = $tempOrder->shipping_methods ?? [];
            $selectedId = (string) $validated['shipping_method'];

            $picked = collect($methods)->first(function ($m) use ($selectedId) {
                return isset($m['id']) && (string) $m['id'] === $selectedId;
            });

            if ($picked === null) {
                return response()->json([
                    'error' => 'Invalid shipping method. Go back to shipping, refresh checkout, and try again.',
                ], 422);
            }

            $newShippingCost = round((float) ($picked['cost'] ?? 0), 2);

            if ($selectedId !== 'standard' && $selectedId !== '') {
                $shippoPatch = [
                    'shippo_rate_object_id' => $selectedId,
                    'shippo_rate_amount' => $newShippingCost,
                    'shippo_carrier' => $picked['provider'] ?? null,
                ];
            } else {
                $shippoPatch = [
                    'shippo_rate_object_id' => null,
                    'shippo_rate_amount' => null,
                    'shippo_carrier' => null,
                ];
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

        // Update temp order with latest values (manual: merge Shippo rate id for label purchase)
        $tempOrder->update(array_merge([
            'tax_amount' => $newTaxAmount,
            'shipping_cost' => $newShippingCost,
            'total_amount' => $newTotalAmount,
            'selected_shipping_method' => $validated['shipping_method'],
            'printify_status' => $printifyStatus,
        ], $shippoPatch));

        DB::beginTransaction();
        try {
            // Create Stripe payment intent with UPDATED amount
            $paymentIntent = PaymentIntent::create([
                'amount' => (int) ($tempOrder->total_amount * 100),
                'currency' => 'usd',
                'description' => 'Marketplace Order - '.$user->email,
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
            \Log::error('Payment intent creation error: '.$e->getMessage());

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
            ->with([
                'cart.items.product',
                'cart.items.marketplaceProduct',
                'cart.items.organizationProduct.marketplaceProduct',
                'cart.items.organizationProduct.organization',
            ])
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
                        'error' => "Insufficient Believe Points. You need {$pointsRequired} points but only have {$user->believe_points} points.",
                    ], 400);
                }

                // Deduct points
                if (! $user->deductBelievePoints($pointsRequired)) {
                    DB::rollBack();

                    return response()->json([
                        'error' => 'Failed to deduct Believe Points. Please try again.',
                    ], 500);
                }
            } else {
                // Validate Stripe payment
                if (! isset($validated['payment_intent_id'])) {
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

            $tempOrder->loadMissing([
                'cart.items.product',
                'cart.items.marketplaceProduct',
                'cart.items.organizationProduct.marketplaceProduct',
                'cart.items.organizationProduct.organization',
            ]);

            $firstItem = $tempOrder->cart->items->first();
            $orderOrganizationId = null;
            if ($firstItem) {
                if ($firstItem->marketplace_product_id) {
                    $orderOrganizationId = null;
                } elseif ($firstItem->organization_product_id) {
                    $orderOrganizationId = $firstItem->organizationProduct?->organization_id;
                } else {
                    $orderOrganizationId = $firstItem->product?->organization_id;
                }
            }

            // Create final order
            $order = Order::create([
                'user_id' => $user->id,
                'organization_id' => $orderOrganizationId,
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

            // Create order items from cart; pool lines use organization_products + revenue split
            $splitMerchantCents = 0;
            $splitOrgCents = 0;
            $splitBiuCents = 0;

            foreach ($tempOrder->cart->items as $cartItem) {
                $donationPerItem = 0;
                $lineSubtotal = (float) $cartItem->unit_price * (int) $cartItem->quantity;

                if ($cartItem->marketplace_product_id) {
                    $mp = $cartItem->marketplaceProduct;

                    if (! $mp) {
                        throw new \Exception('Invalid merchant product in cart.');
                    }

                    $lineCents = (int) round($lineSubtotal * 100);
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

                    OrderItem::create([
                        'order_id' => $order->id,
                        'product_id' => null,
                        'organization_product_id' => null,
                        'marketplace_product_id' => $mp->id,
                        'organization_id' => null,
                        'printify_product_id' => null,
                        'printify_variant_id' => null,
                        'printify_blueprint_id' => null,
                        'printify_print_provider_id' => null,
                        'quantity' => $cartItem->quantity,
                        'unit_price' => $cartItem->unit_price,
                        'subtotal' => $lineSubtotal,
                        'per_organization_donation_amount' => $donationPerItem,
                        'variant_data' => $cartItem->variant_options,
                        'primary_image' => $cartItem->variant_image,
                        'product_details' => [
                            'marketplace_product_id' => $mp->id,
                            'merchant_id' => $mp->merchant_id,
                            'name' => $mp->name,
                        ],
                    ]);

                    if ($mp->inventory_quantity !== null) {
                        $mp->decrement('inventory_quantity', (int) $cartItem->quantity);
                    }
                } elseif ($cartItem->organization_product_id) {
                    $op = $cartItem->organizationProduct;
                    $mp = $op?->marketplaceProduct;

                    if (! $op || ! $mp) {
                        throw new \Exception('Invalid merchant pool listing in cart.');
                    }

                    $lineCents = (int) round($lineSubtotal * 100);
                    $pctM = (float) ($mp->pct_merchant ?? 0);
                    $pctN = (float) ($mp->pct_nonprofit ?? 0);
                    $useNonprofitSplit = $mp->nonprofit_marketplace_enabled
                        && abs($pctM + $pctN) > 0.01;
                    if ($useNonprofitSplit) {
                        $mCents = (int) round($lineCents * $pctM / 100);
                        $nCents = (int) round($lineCents * $pctN / 100);
                        $bCents = $lineCents - $mCents - $nCents;
                    } else {
                        // Merchant Hub direct sale (no nonprofit split): pay merchant 100% of line.
                        $mCents = $lineCents;
                        $nCents = 0;
                        $bCents = 0;
                    }

                    $splitMerchantCents += $mCents;
                    $splitOrgCents += $nCents;
                    $splitBiuCents += $bCents;

                    OrderItem::create([
                        'order_id' => $order->id,
                        'product_id' => null,
                        'organization_product_id' => $op->id,
                        'marketplace_product_id' => null,
                        'organization_id' => $op->organization_id,
                        'printify_product_id' => null,
                        'printify_variant_id' => null,
                        'printify_blueprint_id' => null,
                        'printify_print_provider_id' => null,
                        'quantity' => $cartItem->quantity,
                        'unit_price' => $cartItem->unit_price,
                        'subtotal' => $lineSubtotal,
                        'per_organization_donation_amount' => $donationPerItem,
                        'variant_data' => $cartItem->variant_options,
                        'primary_image' => $cartItem->variant_image,
                        'product_details' => [
                            'marketplace_product_id' => $mp->id,
                            'merchant_id' => $mp->merchant_id,
                            'name' => $mp->name,
                            'organization_product_id' => $op->id,
                        ],
                    ]);

                    if ($mp->inventory_quantity !== null) {
                        $mp->decrement('inventory_quantity', (int) $cartItem->quantity);
                    }
                } else {
                    $product = $cartItem->product;
                    if (! $product) {
                        throw new \Exception('Invalid catalog product in cart.');
                    }

                    $mp = null;
                    if ($product->marketplace_product_id) {
                        $mp = MarketplaceProduct::query()->find($product->marketplace_product_id);
                        if (! $mp) {
                            throw new \Exception('Linked merchant product not found for catalog item.');
                        }
                        if ($product->organization_id && ! $mp->nonprofit_marketplace_enabled) {
                            throw new \Exception(
                                'This nonprofit listing is no longer available: the merchant has disabled nonprofit resale for the source product. Remove it from your cart.'
                            );
                        }
                    }

                    if ($mp) {
                        $lineCents = (int) round($lineSubtotal * 100);
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

                    OrderItem::create([
                        'order_id' => $order->id,
                        'product_id' => $cartItem->product_id,
                        'organization_product_id' => null,
                        'marketplace_product_id' => $mp?->id,
                        'organization_id' => $product->organization_id,
                        'printify_product_id' => $product->printify_product_id,
                        'printify_variant_id' => $cartItem->printify_variant_id,
                        'printify_blueprint_id' => $cartItem->printify_blueprint_id,
                        'printify_print_provider_id' => $cartItem->printify_print_provider_id,
                        'quantity' => $cartItem->quantity,
                        'unit_price' => $cartItem->unit_price,
                        'subtotal' => $lineSubtotal,
                        'per_organization_donation_amount' => $donationPerItem,
                        'variant_data' => $cartItem->variant_options,
                        'primary_image' => $cartItem->variant_image,
                        'product_details' => $mp ? [
                            'merchant_hub_org_catalog' => true,
                            'marketplace_product_id' => $mp->id,
                            'merchant_id' => $mp->merchant_id,
                            'name' => $product->name,
                        ] : null,
                    ]);

                    $product->update([
                        'quantity_ordered' => $product->quantity_ordered + $cartItem->quantity,
                        'quantity_available' => $product->quantity_available - $cartItem->quantity,
                    ]);
                }
            }

            if ($splitMerchantCents + $splitOrgCents + $splitBiuCents > 0) {
                OrderSplit::create([
                    'order_id' => $order->id,
                    'merchant_amount' => number_format($splitMerchantCents / 100, 2, '.', ''),
                    'organization_amount' => number_format($splitOrgCents / 100, 2, '.', ''),
                    'biu_amount' => number_format($splitBiuCents / 100, 2, '.', ''),
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

            $stripeFeeUsd = 0.0;
            if ($paymentMethod === 'stripe' && $paymentIntent !== null) {
                try {
                    $expanded = PaymentIntent::retrieve($paymentIntent->id, [
                        'expand' => ['latest_charge.balance_transaction'],
                    ]);
                    $charge = $expanded->latest_charge ?? null;
                    $bt = is_object($charge) ? ($charge->balance_transaction ?? null) : null;
                    if (is_object($bt) && isset($bt->fee)) {
                        $stripeFeeUsd = (float) $bt->fee / 100;
                    }
                } catch (\Throwable $e) {
                    \Log::warning('Marketplace checkout: could not read Stripe processing fee from PaymentIntent', [
                        'order_id' => $order->id,
                        'payment_intent_id' => $paymentIntent->id ?? null,
                        'message' => $e->getMessage(),
                    ]);
                }
            }

            $ledgerMeta = MarketplaceOrderLedgerService::transactionMeta(
                $order->fresh(['orderSplit']),
                $stripeFeeUsd
            );
            if ($paymentMethod === 'believe_points') {
                $ledgerMeta['believe_points_used'] = $pointsRequired;
            }
            if (! empty($tempOrder->printify_order_id)) {
                $ledgerMeta['printify_order_id'] = $tempOrder->printify_order_id;
            }

            if (! Transaction::query()
                ->where('related_type', Order::class)
                ->where('related_id', $order->id)
                ->where('type', 'purchase')
                ->exists()) {
                Transaction::create([
                    'user_id' => $user->id,
                    'related_id' => $order->id,
                    'related_type' => Order::class,
                    'type' => 'purchase',
                    'status' => Transaction::STATUS_COMPLETED,
                    'amount' => $order->total_amount,
                    'fee' => $paymentMethod === 'stripe' ? round($stripeFeeUsd, 2) : 0,
                    'currency' => 'USD',
                    'payment_method' => $paymentMethod === 'stripe' ? 'stripe' : 'believe_points',
                    'transaction_id' => $paymentMethod === 'stripe' && $paymentIntent !== null
                        ? $paymentIntent->id
                        : 'mp_order_'.$order->id.'_points',
                    'meta' => $ledgerMeta,
                    'processed_at' => now(),
                ]);
            }

            // Clear cart
            $tempOrder->cart->items()->delete();

            // Update temp order status
            $tempOrder->update(['status' => 'payment_completed']);

            DB::commit();

            try {
                $order->load('items');
                app(SupporterActivityService::class)->recordPurchasesForOrder($order);
            } catch (\Throwable $e) {
                \Log::warning('Supporter activity (purchase) failed', [
                    'order_id' => $order->id,
                    'error' => $e->getMessage(),
                ]);
            }

            // Post-commit: for manual-only orders, auto-create Shippo label/tracking
            // (Printify orders are handled via Printify webhooks + OrderController UI.)
            try {
                if ($this->shippoService->isConfigured() && empty($order->printify_order_id) && ! empty($tempOrder->shippo_rate_object_id)) {
                    $purchase = $this->shippoService->purchaseLabel((string) $tempOrder->shippo_rate_object_id);

                    if (($purchase['success'] ?? false) === true) {
                        // Load relations for parcel snapshot.
                        $order->load(['items.product', 'shippingInfo']);
                        $parcel = $this->shippoService->getParcelSnapshot($order);
                        $shippingInfo = $order->shippingInfo;
                        $shipToName = trim(($shippingInfo?->first_name ?? '').' '.($shippingInfo?->last_name ?? ''));

                        $order->update([
                            'shippo_shipment_id' => $tempOrder->shippo_shipment_id,
                            'shippo_transaction_id' => $purchase['transaction_id'] ?? null,
                            'tracking_number' => $purchase['tracking_number'] ?? null,
                            'tracking_url' => $purchase['tracking_url'] ?? null,
                            'label_url' => $purchase['label_url'] ?? null,
                            'carrier' => $purchase['carrier'] ?? null,
                            'shipping_status' => 'label_created',
                            'shipped_at' => now(),
                        ]);

                        ShippoShipment::updateOrCreate(
                            ['order_id' => $order->id, 'product_type' => 'manual'],
                            [
                                'shippo_shipment_id' => $tempOrder->shippo_shipment_id,
                                'selected_rate_object_id' => (string) $tempOrder->shippo_rate_object_id,
                                'shippo_transaction_id' => $purchase['transaction_id'] ?? null,
                                'tracking_number' => $purchase['tracking_number'] ?? null,
                                'label_url' => $purchase['label_url'] ?? null,
                                'carrier' => $purchase['carrier'] ?? null,
                                'ship_to_name' => $shipToName ?: null,
                                'ship_to_street1' => (string) ($shippingInfo?->shipping_address ?? ''),
                                'ship_to_city' => $shippingInfo?->city ?: null,
                                'ship_to_state' => $shippingInfo?->state ?: null,
                                'ship_to_zip' => $shippingInfo?->zip ?: null,
                                'ship_to_country' => $shippingInfo?->country ?: null,
                                'parcel_weight_oz' => $parcel['weight'] ?? null,
                                'parcel_length_in' => $parcel['length'] ?? null,
                                'parcel_width_in' => $parcel['width'] ?? null,
                                'parcel_height_in' => $parcel['height'] ?? null,
                                'status' => 'label_created',
                            ]
                        );
                    }
                }
            } catch (\Exception $e) {
                // Shipping label failure should not break the purchase completion.
                \Log::error('Auto Shippo label failed (checkout confirmPayment)', [
                    'order_id' => $order->id ?? null,
                    'error' => $e->getMessage(),
                ]);
            }

            return response()->json([
                'success' => true,
                'orderId' => $order->id,
                'redirect' => route('user.profile.orders'),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Payment confirmation error: '.$e->getMessage());
            \Log::error('Stack trace: '.$e->getTraceAsString());

            return response()->json(['error' => 'Failed to process payment: '.$e->getMessage()], 500);
        }
    }

    /**
     * Prepare Printify order data - only includes Printify products
     */
    private function preparePrintifyOrder(Cart $cart, TempOrder $tempOrder): array
    {
        $lineItems = [];

        foreach ($cart->items as $item) {
            // Only include Printify catalog products (skip pool listings and manual products)
            if (
                $item->product_id
                && $item->product
                && ! empty($item->product->printify_product_id)
                && ! empty($item->printify_variant_id)
            ) {
                $lineItems[] = [
                    'product_id' => $item->product->printify_product_id,
                    'variant_id' => (int) $item->printify_variant_id,
                    'quantity' => $item->quantity,
                    'external_id' => 'temp-'.$tempOrder->id.'-item-'.$item->id,
                ];
            }
        }

        return [
            'external_id' => 'ORDER-'.$tempOrder->id.'-'.uniqid(),
            'label' => 'ORDER-LABEL'.$tempOrder->id,
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

            $defaultCost = (float) (($printifyOrder['total_shipping'] ?? 0) / 100);

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
            \Log::error('Shipping calculation error: '.$e->getMessage());

            return [
                'cost' => 9.99,
                'methods' => [
                    [
                        'id' => 'standard',
                        'name' => 'Standard Shipping',
                        'cost' => 9.99,
                        'estimated_days' => '10-30 business days',
                    ],
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
            // Check if this is a Printify order or manual product
            if ($tempOrder->printify_order_id) {
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
            } else {
                // For manual products, use existing tax and shipping (already calculated in step 1)
                $newTaxAmount = $tempOrder->tax_amount ?? 0;
                $shippingCost = $tempOrder->shipping_cost ?? 0;

                \Log::info('Tax amount for manual product (no update needed)', [
                    'temp_order_id' => $tempOrder->id,
                    'tax_amount' => $newTaxAmount,
                    'shipping_cost' => $shippingCost,
                ]);
            }

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
            \Log::error('Tax update error: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'error' => 'Failed to update tax amount',
            ], 500);
        }
    }
}
