<?php

namespace App\Http\Controllers;

use App\Models\Bid;
use App\Models\Category;
use App\Models\Merchant;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderShippingInfo;
use App\Models\Organization;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\ShippoShipment;
use App\Models\StateSalesTax;
use App\Models\User;
use App\Notifications\BidCancelledNotification;
use App\Notifications\BidLostNotification;
use App\Notifications\BidWonNotification;
use App\Services\BiuPlatformFeeService;
use App\Services\PrintifyService;
use App\Services\ShippoService;
use App\Services\SupporterActivityService;
use App\Support\StripeAutomaticTax;
use App\Support\StripeCustomerChargeAmount;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Cashier\Cashier;

class ProductController extends BaseController
{
    protected $printifyService;

    protected ShippoService $shippoService;

    public function __construct(PrintifyService $printifyService, ShippoService $shippoService)
    {
        $this->printifyService = $printifyService;
        $this->shippoService = $shippoService;
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): Response
    {
        $this->authorizePermission($request, 'product.read');

        $organization = Organization::where('user_id', Auth::id())->first();

        $perPage = $request->get('per_page', 10);
        $page = $request->get('page', 1);
        $search = $request->get('search', '');

        $query = Product::query();

        // Only show products for current user
        if (Auth::user()->role == 'organization') {
            $query->where('organization_id', @$organization->id);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%")
                    ->orWhere('description', 'LIKE', "%{$search}%")
                    ->orWhere('sku', 'LIKE', "%{$search}%");
            });
        }

        $products = $query->with(['organization', 'categories'])
            ->withCount('bids')
            ->orderBy('id', 'desc')
            ->paginate($perPage, ['*'], 'page', $page);

        return Inertia::render('products/index', [
            'products' => $products,
            'filters' => [
                'per_page' => (int) $perPage,
                'page' => (int) $page,
                'search' => $search,
            ],
            'allowedPerPage' => [5, 10, 25, 50, 100],
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(Request $request): Response
    {
        $this->authorizePermission($request, 'product.create');

        $categories = $this->categoriesForProductForm();
        $organizations = Organization::all(['id', 'name']);
        $merchantsForShipFrom = $this->merchantsForShipFromPicker();

        // Get Printify blueprints for product types
        $blueprints = [];
        if (Auth::user()->role === 'admin' || Auth::user()->role === 'organization') {
            try {
                $blueprints = $this->printifyService->getBlueprints();
            } catch (\Exception $e) {
                // Silently fail - user can still create regular products
            }
        }

        return Inertia::render('products/create', [
            'categories' => $categories,
            'organizations' => $organizations,
            'merchants_for_ship_from' => $merchantsForShipFrom,
            'blueprints' => $blueprints,
            'printify_enabled' => ! empty($blueprints),
        ]);
    }

    /**
     * @return array<int, array{id: int, label: string, address_preview: array<string, string>}>
     */
    private function merchantsForShipFromPicker(): array
    {
        return Merchant::query()
            ->where('status', 'active')
            ->with(['shippingAddresses' => fn ($q) => $q->orderByDesc('is_default')->orderBy('id')])
            ->orderBy('business_name')
            ->orderBy('name')
            ->get()
            ->map(function (Merchant $m) {
                $parts = $m->shipFromAddressForRates();

                return [
                    'id' => $m->id,
                    'label' => $m->business_name ?: $m->name,
                    'address_preview' => [
                        'name' => $parts['name'],
                        'street1' => $parts['street1'],
                        'street2' => $parts['street2'] ?? '',
                        'city' => $parts['city'],
                        'state' => $parts['state'],
                        'zip' => $parts['zip'],
                        'country' => $parts['country'],
                    ],
                ];
            })
            ->values()
            ->all();
    }

    /**
     * Normalize ship-from fields for manual products (Shippo). No-op for Printify create/update payloads.
     *
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    protected function normalizeValidatedManualPhysicalShipFrom(array $validated, bool $isPrintifyProduct): array
    {
        if ($isPrintifyProduct) {
            unset($validated['ship_from_mode']);

            return $validated;
        }

        if (($validated['type'] ?? 'physical') === 'physical') {
            if (($validated['ship_from_mode'] ?? '') === 'merchant') {
                if (empty($validated['ship_from_merchant_id'])) {
                    throw ValidationException::withMessages([
                        'ship_from_merchant_id' => 'Select a merchant whose address will be used as the ship-from location.',
                    ]);
                }
                $merchant = Merchant::query()
                    ->where('id', $validated['ship_from_merchant_id'])
                    ->where('status', 'active')
                    ->first();
                if (! $merchant) {
                    throw ValidationException::withMessages([
                        'ship_from_merchant_id' => 'Invalid merchant selected.',
                    ]);
                }
                $parts = $merchant->shipFromAddressForRates();
                if (trim((string) $parts['street1']) === '' || trim((string) $parts['city']) === '' || trim((string) $parts['zip']) === '') {
                    throw ValidationException::withMessages([
                        'ship_from_merchant_id' => 'That merchant does not have a complete ship-from address. Add a default shipping address or business address on the merchant profile.',
                    ]);
                }
                $validated['ship_from_name'] = null;
                $validated['ship_from_street1'] = null;
                $validated['ship_from_city'] = null;
                $validated['ship_from_state'] = null;
                $validated['ship_from_zip'] = null;
                $validated['ship_from_country'] = null;
            } else {
                $validated['ship_from_merchant_id'] = null;
                $requiredCustom = [
                    'ship_from_name' => 'Contact or business name',
                    'ship_from_street1' => 'Street address',
                    'ship_from_city' => 'City',
                    'ship_from_state' => 'State / region',
                    'ship_from_zip' => 'Postal code',
                    'ship_from_country' => 'Country',
                ];
                foreach ($requiredCustom as $field => $label) {
                    if (trim((string) ($validated[$field] ?? '')) === '') {
                        throw ValidationException::withMessages([
                            $field => "{$label} is required for a custom ship-from address (Shippo).",
                        ]);
                    }
                }
                $validated['ship_from_country'] = strtoupper((string) $validated['ship_from_country']);
            }
        } else {
            $validated['ship_from_merchant_id'] = null;
            if (($validated['type'] ?? '') === 'digital') {
                $validated['ship_from_name'] = null;
                $validated['ship_from_street1'] = null;
                $validated['ship_from_city'] = null;
                $validated['ship_from_state'] = null;
                $validated['ship_from_zip'] = null;
                $validated['ship_from_country'] = null;
                $validated['parcel_length_in'] = null;
                $validated['parcel_width_in'] = null;
                $validated['parcel_height_in'] = null;
                $validated['parcel_weight_oz'] = null;
            }
        }

        unset($validated['ship_from_mode']);

        return $validated;
    }

    public function show(Request $request, $id): Response
    {
        $user = $request->user();

        // Check if this is an admin request (from products management)
        $isAdminRequest = $user && $user->role === 'admin';

        if ($isAdminRequest) {
            // Admin viewing product
            $product = Product::with([
                'organization',
                'categories',
                'variants',
            ])->findOrFail($id);

            return Inertia::render('products/show', [
                'product' => $product,
            ]);
        }

        // If organization user tries to view a product, show message that only supporters can buy
        if ($user && $user->role === 'organization') {
            $product = Product::with([
                'organization',
                'categories',
                'variants',
            ])->findOrFail($id);

            // Check if product is available for marketplace
            if ($product->status !== 'active' || $product->quantity_available <= 0) {
                abort(404, 'Product not found');
            }

            return Inertia::render('frontend/product-view', [
                'product' => $product,
                'printifyProduct' => null,
                'variants' => [],
                'firstVariant' => null,
                'isOrganizationUser' => true,
                'message' => 'Only supporters can purchase products. Please log in with a supporter account to buy this product.',
            ]);
        }

        // Public marketplace view - supports both manual and Printify products
        $product = Product::with([
            'organization',
            'categories',
            'variants',
        ])->findOrFail($id);

        // Check if product is available for marketplace
        if ($product->status !== 'active' || $product->quantity_available <= 0) {
            abort(404, 'Product not found');
        }

        $printifyProduct = null;
        $variantsWithImages = [];

        // Handle Printify products
        if ($product->printify_product_id) {
            try {
                $printifyProduct = $this->printifyService->getProduct($product->printify_product_id);

                // শুধু আপনার database-এ available variants নিন
                $availableVariantIds = $product->variants->pluck('printify_variant_id')->toArray();

                if (isset($printifyProduct['variants']) && isset($printifyProduct['images'])) {
                    $variantsWithImages = $this->mapVariantsWithImages(
                        $printifyProduct['variants'],
                        $printifyProduct['images'],
                        $availableVariantIds // শুধু available variants filter করবে
                    );
                }

            } catch (\Exception $e) {
                \Log::error('Error fetching Printify product: '.$e->getMessage());
                // Fallback: use database variants if available
                $variantsWithImages = [];
                if ($product->variants->isNotEmpty()) {
                    foreach ($product->variants as $variant) {
                        $variantsWithImages[] = [
                            'id' => $variant->printify_variant_id,
                            'sku' => $product->sku,
                            'name' => $product->name,
                            'price' => $product->unit_price ?? 0,
                            'is_available' => $variant->is_available ?? true,
                            'attributes' => [],
                            'images' => $product->image ? [['src' => $product->image, 'position' => 'front', 'is_default' => true]] : [],
                            'primary_image' => $product->image,
                        ];
                    }
                }
            }
        } else {
            // For manual products, create a simple variant structure
            $variantsWithImages = [
                [
                    'id' => 'manual',
                    'sku' => $product->sku,
                    'name' => $product->name,
                    'cost' => 0,
                    'price' => $product->unit_price ?? 0,
                    'is_available' => $product->quantity_available > 0,
                    'grams' => 0,
                    'attributes' => [],
                    'images' => $product->image ? [['src' => $product->image, 'position' => 'front', 'is_default' => true]] : [],
                    'primary_image' => $product->image,
                ],
            ];
        }

        // Get first available variant
        $firstVariant = ! empty($variantsWithImages) ? $variantsWithImages[0] : null;

        // Bidding info for auction / blind bid (only when bidding is still open; no winner yet)
        $biddingInfo = null;
        $biddingClosed = false;
        $winnerStatus = null;
        $isCurrentUserWinner = false;
        if ($product->isBiddable()) {
            if ($product->hasWinner()) {
                $biddingClosed = true;
                $winnerStatus = $product->winner_status;
                $isCurrentUserWinner = $user && (int) $product->winner_user_id === (int) $user->id;
            } else {
                $bidEnd = $product->isAuction() ? $product->auction_end : $product->bid_deadline;
                $minBid = $product->isAuction()
                    ? ($product->getCurrentBidAmount() ?? (float) $product->starting_bid)
                    : (float) $product->min_bid;
                if ($product->isAuction() && $product->bid_increment) {
                    $minBid = $product->getCurrentBidAmount() !== null
                        ? (float) $product->getCurrentBidAmount() + (float) $product->bid_increment
                        : (float) $product->starting_bid;
                }
                $biddingInfo = [
                    'current_bid' => $product->getCurrentBidAmount(),
                    'bid_end_at' => $bidEnd?->toIso8601String(),
                    'min_bid' => $minBid,
                    'buy_now_price' => $product->buy_now_price ? (float) $product->buy_now_price : null,
                    'bid_increment' => $product->bid_increment ? (float) $product->bid_increment : null,
                ];
            }
        }

        return Inertia::render('frontend/product-view', [
            'product' => $product,
            'printifyProduct' => $printifyProduct,
            'variants' => $variantsWithImages,
            'firstVariant' => $firstVariant,
            'biddingInfo' => $biddingInfo,
            'biddingClosed' => $biddingClosed,
            'winnerStatus' => $winnerStatus,
            'isCurrentUserWinner' => $isCurrentUserWinner,
            // 'relatedProducts' => Product::query()
            //     ->where('id', '!=', $product->id)
            //     ->where('status', 'active')
            //     ->where('quantity_available', '>', 0)
            //     ->limit(4)
            //     ->get(),
        ]);
    }

    /**
     * শুধু available variants filter করবে
     */
    private function mapVariantsWithImages(array $variants, array $images, array $availableVariantIds = []): array
    {
        $variantsWithImages = [];

        foreach ($variants as $variant) {
            // শুধু available variants নিন
            if (! empty($availableVariantIds) && ! in_array($variant['id'], $availableVariantIds)) {
                continue;
            }

            if (! $variant['is_available']) {
                continue;
            }

            // Find images for this variant
            $variantImages = [];
            foreach ($images as $image) {
                if (in_array($variant['id'], $image['variant_ids'])) {
                    $variantImages[] = [
                        'src' => $image['src'],
                        'position' => $image['position'],
                        'is_default' => $image['is_default'] ?? false,
                    ];
                }
            }

            // Get variant options/attributes
            $attributes = $this->extractVariantAttributes($variant);

            $variantsWithImages[] = [
                'id' => $variant['id'],
                'sku' => $variant['sku'],
                'name' => $variant['title'],
                'cost' => $variant['cost'] / 100,
                'price' => $variant['price'] / 100,
                'is_available' => $variant['is_available'],
                'grams' => $variant['grams'],
                'attributes' => $attributes,
                'images' => $variantImages,
                'primary_image' => ! empty($variantImages) ? $variantImages[0]['src'] : null,
            ];
        }

        return $variantsWithImages;
    }

    private function extractVariantAttributes(array $variant): array
    {
        $attributes = [];
        $attributes['size'] = $variant['title'];

        return $attributes;
    }

    /**
     * Get shipping costs from Printify API
     */
    // private function getProductMakingCosts($blueprintId, $providerId): array
    // {
    //     try {
    //         $response = $this->printifyService->getProductShippingCosts($blueprintId, $providerId);

    //         $profiles = $response['profiles'] ?? [];

    //         \Log::info('Printify shipping costs response', ['response profiles' => $profiles]);

    //         if (empty($profiles)) {
    //             return [
    //                 'first_item_cost' => 0,
    //                 'additional_item_cost' => 0
    //             ];
    //         }

    //         // Find US shipping profile specifically
    //         $usProfile = $this->findUsShippingProfile($profiles);

    //         // If US profile not found, use the first available profile as fallback
    //         $targetProfile = $usProfile ?? $profiles[0];

    //         return [
    //             'first_item_cost' => ($targetProfile['first_item']['cost'] ?? 0) / 100, // Convert cents to dollars
    //             'additional_item_cost' => ($targetProfile['additional_items']['cost'] ?? 0) / 100 // Convert cents to dollars
    //         ];

    //     } catch (\Exception $e) {
    //         return [
    //             'first_item_cost' => 0,
    //             'additional_item_cost' => 0
    //         ];
    //     }
    // }

    /**
     * Find US shipping profile from the profiles array
     */
    private function findUsShippingProfile(array $profiles): ?array
    {
        foreach ($profiles as $profile) {
            $countries = $profile['countries'] ?? [];

            // Check if this profile includes US
            if (in_array('US', $countries)) {
                return $profile;
            }
        }

        return null;
    }

    /**
     * Store a newly created resource in storage.
     */
    // public function store(Request $request)
    // {
    //     $this->authorizePermission($request, 'product.create');

    //     $validated = $request->validate([
    //         'name' => 'required|string|max:255',
    //         'description' => 'required|string|max:1000',
    //         'quantity' => 'required|integer|min:0',
    //         // 'unit_price' => 'required|numeric|min:0',
    //         'profit_margin_percentage' => 'required|numeric|min:0',
    //         'owned_by' => 'required|in:admin,organization',
    //         'organization_id' => 'nullable|integer|exists:organizations,id',
    //         'status' => 'required|in:active,inactive,archived',
    //         'sku' => 'required|string|max:255|unique:products,sku',
    //         'type' => 'required|in:digital,physical',
    //         'tags' => 'nullable|string',
    //         'categories' => 'array',
    //         'categories.*' => 'integer|exists:categories,id',
    //         'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg',

    //         // Printify specific fields
    //         'is_printify_product' => 'nullable|boolean',
    //         'printify_blueprint_id' => 'required|integer',
    //         'printify_provider_id' => 'required|integer',
    //         'printify_variants' => 'required|array',
    //         'printify_images' => ['required', 'array', 'min:1'],
    //         'printify_images.*' => ['required', 'string', 'url', 'regex:/\.(png|jpg|jpeg|svg)$/i'],
    //     ], [
    //         'printify_images.required' => 'At least one design image is required for Printify products.',
    //         'printify_images.min' => 'At least one design image is required for Printify products.',
    //         'printify_images.*.required' => 'Each image URL is required.',
    //         'printify_images.*.url' => 'Please enter a valid URL for the image.',
    //         'printify_images.*.regex' => 'Image URL must end with .png, .jpg, or .jpeg extension.',
    //     ]);

    //     try {
    //         $imagePath = null;
    //         if ($request->hasFile('image')) {
    //             $image = $request->file('image');
    //             $imageName = time() . '_' . $image->getClientOriginalName();
    //             $imagePath = $image->storeAs('products', $imageName, 'public');
    //         }

    //         $categories = $validated['categories'] ?? [];
    //         unset($validated['categories']);

    //         // Handle Printify product creation
    //         $printifyProductId = null;
    //         if ($request->boolean('is_printify_product') && $request->printify_blueprint_id) {

    //             // Step 1: Create product (আপনার createPrintifyProduct() ঠিক আছে)
    //             $printifyProductId = $this->createPrintifyProduct($request, $validated, $dummyPrice = 1);

    //             // Step 2: Get product details to read real cost
    //             $productDetails = $this->printifyService->getProduct($printifyProductId);

    //             if (!$productDetails || !isset($productDetails['variants'])) {
    //                 throw new \Exception('Failed to fetch product details');
    //             }

    //             // এই লাইনটা সবচেয়ে গুরুত্বপূর্ণ — create করার সময় যে variant গুলো দিয়েছেন, ঠিক সেগুলোই নিন
    //             $selectedVariantIds = $request->input('printify_variants', []); // এটা array of arrays
    //             $selectedVariantIds = array_column($selectedVariantIds, 'id'); // [17390, 17391, ...]

    //             // Profit margin
    //             $profitMargin = $validated['profit_margin_percentage'] ?? 40;

    //             // Build updated variants (only selected ones)
    //             $updatedVariants = [];
    //             foreach ($productDetails['variants'] as $variant) {
    //                 if (!in_array($variant['id'], $selectedVariantIds)) {
    //                     continue; // skip non-selected
    //                 }

    //                 $costInCents = $variant['cost'] ?? 0;
    //                 $costInDollars = $costInCents / 100;
    //                 $sellingPriceInDollars = $costInDollars + ($costInDollars * $profitMargin / 100);
    //                 $sellingPriceInCents = (int) round($sellingPriceInDollars * 100);

    //                 $updatedVariants[] = [
    //                     'id' => $variant['id'],
    //                     'price' => $sellingPriceInCents,
    //                     'is_enabled' => true
    //                 ];
    //             }

    //             // এই payload টা ১০০% কাজ করবে — কোনো কিছু destroy হবে না
    //             $updatePayload = [
    //                 'title' => $validated['name'],
    //                 'description' => $validated['description'],
    //                 'variants' => $updatedVariants,
    //                 'print_areas' => [
    //                     [
    //                         // এই লাইনটা সবচেয়ে গুরুত্বপূর্ণ — create করার সময় যা দিয়েছেন, ঠিক তাই দিন
    //                         'variant_ids' => $selectedVariantIds, // ← এই array টা create-এর সময় যা দিয়েছেন, ঠিক সেইটা
    //                         'placeholders' => [
    //                             [
    //                                 'position' => 'front',
    //                                 'images' => $this->preparePrintifyImages($request->printify_images ?? [])
    //                             ]
    //                         ]
    //                     ]
    //                 ]
    //             ];

    //             // Update করুন
    //             $updateResponse = $this->printifyService->updateProduct($printifyProductId, $updatePayload);

    //             if (isset($updateResponse['status']) && $updateResponse['status'] === 'error') {
    //                 \Log::error('Printify update failed', [
    //                     'payload' => $updatePayload,
    //                     'response' => $updateResponse
    //                 ]);
    //                 throw new \Exception('Printify update failed: ' . $updateResponse['message']);
    //             }

    //             \Log::info('Printify product updated successfully with correct variant matching', [
    //                 'product_id' => $printifyProductId,
    //                 'variant_count' => count($updatedVariants),
    //                 'variant_ids_in_print_areas' => $selectedVariantIds
    //             ]);
    //         }

    //         $productData = [
    //             'user_id' => Auth::id(),
    //             'image' => $imagePath,
    //             'quantity_available' => $validated['quantity'],
    //             'printify_product_id' => $printifyProductId,
    //             'printify_blueprint_id' => $request->printify_blueprint_id,
    //             'printify_provider_id' => $request->printify_provider_id,
    //         ];

    //         // Merge with validated data
    //         $productData = array_merge($validated, $productData);

    //         $product = Product::create($productData);
    //         $product->categories()->sync($categories);

    //         if (Auth::user()->role == "organization") {
    //             $organization = Organization::where('user_id', Auth::id())->first();
    //             $product->update([
    //                 'owned_by' => 'organization',
    //                 'organization_id' => $organization->id,
    //             ]);
    //         }

    //         if($request->boolean('is_printify_product') && $request->printify_variants){
    //                 foreach ($request->printify_variants as $variant) {
    //                     ProductVariant::create([
    //                         'product_id' => $product->id,
    //                         'printify_variant_id' => $variant['id'],
    //                     ]);
    //                 }
    //             }

    //         // Auto-publish if status is active and it's a Printify product
    //         if ($product->printify_product_id && $validated['status'] === 'active') {
    //             $this->autoPublishPrintifyProduct($product);
    //             $product->update([
    //                 'publish_status' => 'publishing',
    //             ]);
    //         }

    //         return redirect()->route('products.index')
    //             ->with('success', 'Product created successfully' . ($printifyProductId ? ' in Printify' : ''));

    //     } catch (\Exception $e) {
    //         return back()->withErrors(['printify_error' => 'Failed to create product: ' . $e->getMessage()]);
    //     }
    // }

    public function store(Request $request)
    {
        $this->authorizePermission($request, 'product.create');

        // Check if organization has active subscription (skip for admin users)
        $user = Auth::user();

        // Skip subscription check for admin users
        if ($user->role === 'admin') {
            // Admin users can always create products
        } elseif ($user->role === 'organization' || $user->role === 'organization_pending') {
            $organization = Organization::where('user_id', $user->id)->first();
            if ($organization && $organization->user) {
                // Check if user has active subscription
                // Allow if current_plan_id is set OR if subscription check is disabled via env
                $subscriptionCheckEnabled = env('REQUIRE_SUBSCRIPTION_FOR_PRODUCTS', true);

                if ($subscriptionCheckEnabled && $organization->user->current_plan_id === null) {
                    // Also check if user has active subscription via Cashier
                    $hasActiveSubscription = false;
                    if (method_exists($organization->user, 'subscribed')) {
                        try {
                            $hasActiveSubscription = $organization->user->subscribed();
                        } catch (\Exception $e) {
                            // If subscription check fails, log but don't block
                            \Log::warning('Failed to check subscription status', [
                                'user_id' => $organization->user->id,
                                'error' => $e->getMessage(),
                            ]);
                        }
                    }

                    if (! $hasActiveSubscription) {
                        return redirect()->back()->withErrors([
                            'subscription' => 'An active subscription is required to create and sell products. Please subscribe to continue.',
                        ])->with('subscription_required', true);
                    }
                }
            }
        }

        // Determine if this is a Printify product
        $isPrintifyProduct = $request->boolean('is_printify_product', false);

        $pricingModel = $request->input('pricing_model', 'fixed');

        $productTypeInput = $request->input('type', 'physical');
        $quantityRule = 'required|integer|min:0';
        $unitPriceRule = $pricingModel === 'fixed' ? 'required|numeric|min:0' : 'nullable|numeric|min:0';

        // Base validation rules for all products
        $rules = [
            'name' => 'required|string|max:255|unique:products,name',
            'description' => 'required|string|max:1000',
            'quantity' => $quantityRule,
            'owned_by' => 'required|in:admin,organization',
            'organization_id' => 'nullable|integer|exists:organizations,id',
            'status' => 'required|in:active,inactive,archived',
            'sku' => 'required|string|max:255|unique:products,sku',
            'type' => 'required|in:digital,physical',
            'tags' => 'nullable|string',
            'categories' => [
                'required',
                'array',
                'min:1',
            ],
            'categories.*' => [
                'integer',
                Rule::exists('categories', 'id')->where(fn ($q) => $q->whereNull('parent_id')->where('status', 'active')),
            ],
            'is_printify_product' => 'nullable|boolean',
            'pricing_model' => 'nullable|in:fixed,auction,blind_bid,offer',
            'product_source_type' => ['nullable', Rule::in(['own'])],
            'marketplace_product_id' => ['prohibited'],
        ];

        // Conditional validation based on product type
        if ($isPrintifyProduct) {
            // Printify product validation
            $rules = array_merge($rules, [
                'profit_margin_percentage' => 'required|numeric|min:0|max:1000',
                'printify_blueprint_id' => 'required|integer',
                'printify_provider_id' => 'required|integer',
                'printify_variants' => 'required|array|min:1',
                'printify_images' => 'required|array|min:1',
                'printify_images.*' => 'required|file|image|mimes:png,jpg,jpeg|max:1024', // 1MB max (Printify API requirement)
                'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg', // Optional for Printify (uses design images)
            ]);
        } else {
            // Manual product validation — shipping is from Shippo at checkout, not stored on the product
            $rules = array_merge($rules, [
                'unit_price' => $unitPriceRule,
                'image' => 'required|image|mimes:jpeg,png,jpg,gif,svg',
            ]);
            if ($pricingModel === 'auction') {
                $rules = array_merge($rules, [
                    'starting_bid' => 'required|numeric|min:0',
                    'reserve_price' => 'nullable|numeric|min:0',
                    'buy_now_price' => 'nullable|numeric|min:0',
                    'bid_increment' => 'nullable|numeric|min:0',
                    'auction_start' => 'required|date',
                    'auction_end' => 'required|date|after:auction_start',
                    'auto_extend' => 'nullable|boolean',
                ]);
            }
            if ($pricingModel === 'blind_bid') {
                $rules = array_merge($rules, [
                    'blind_bid_type' => 'required|in:sealed,sealed_revisable,vickrey',
                    'min_bid' => 'required|numeric|min:0',
                    'reserve_price' => 'nullable|numeric|min:0',
                    'bid_deadline' => 'required|date',
                    'winner_notification' => 'nullable|string|max:64',
                    'winner_payment_window' => 'nullable|in:24h,48h,72h',
                    'offer_to_next_if_unpaid' => 'nullable|boolean',
                ]);
            }

            if (in_array($pricingModel, ['fixed', 'offer'], true)) {
                $rules['source_cost'] = ['nullable', 'numeric', 'min:0'];
                $rules['profit_margin_percentage'] = ['nullable', 'numeric', 'min:0', 'max:1000'];
            }

            if ($productTypeInput === 'physical') {
                $rules['ship_from_mode'] = ['required', Rule::in(['custom', 'merchant'])];
                $rules['ship_from_merchant_id'] = [
                    'nullable',
                    'integer',
                    Rule::exists('merchants', 'id')->where('status', 'active'),
                ];
                $rules['ship_from_name'] = ['nullable', 'string', 'max:100'];
                $rules['ship_from_street1'] = ['nullable', 'string', 'max:255'];
                $rules['ship_from_city'] = ['nullable', 'string', 'max:100'];
                $rules['ship_from_state'] = ['nullable', 'string', 'max:50'];
                $rules['ship_from_zip'] = ['nullable', 'string', 'max:20'];
                $rules['ship_from_country'] = ['nullable', 'string', 'max:2'];
                $rules['parcel_length_in'] = ['nullable', 'numeric', 'min:0.01', 'max:999'];
                $rules['parcel_width_in'] = ['nullable', 'numeric', 'min:0.01', 'max:999'];
                $rules['parcel_height_in'] = ['nullable', 'numeric', 'min:0.01', 'max:999'];
                $rules['parcel_weight_oz'] = ['nullable', 'numeric', 'min:0.01', 'max:99999'];
            }
        }

        $messages = [
            'name.required' => 'Product name is required.',
            'name.unique' => 'A product with this name already exists.',
            'description.required' => 'Product description is required.',
            'quantity.required' => 'Quantity is required.',
            'quantity.integer' => 'Quantity must be a number.',
            'quantity.min' => 'Quantity cannot be negative.',
            'sku.required' => 'SKU is required.',
            'sku.unique' => 'A product with this SKU already exists.',
            'image.required' => 'Product image is required for manual products.',
            'image.image' => 'The file must be an image.',
            'unit_price.required' => 'Unit price is required for manual products.',
            'unit_price.numeric' => 'Unit price must be a number.',
            'unit_price.min' => 'Unit price cannot be negative.',
            'categories.required' => 'Select at least one product category.',
            'categories.min' => 'Select at least one product category.',
            'ship_from_mode.required' => 'Choose how Shippo ship-from is set: custom address or merchant warehouse.',
            'product_source_type.in' => 'To sell a merchant pool product, add it from Commerce → Marketplace → Merchant product pool instead of this form.',
            'marketplace_product_id.prohibited' => 'Merchant pool listings are created from the Merchant product pool, not via marketplace_product_id on manual products.',
        ];

        // Printify-specific error messages
        if ($isPrintifyProduct) {
            $messages = array_merge($messages, [
                'printify_blueprint_id.required' => 'Please select a product type.',
                'printify_provider_id.required' => 'Please select a print provider.',
                'printify_variants.required' => 'Please select at least one variant.',
                'printify_variants.min' => 'Please select at least one variant.',
                'printify_images.required' => 'Please upload at least one design image.',
                'printify_images.min' => 'Please upload at least one design image.',
                'printify_images.*.required' => 'Please select a design image file.',
                'printify_images.*.file' => 'The uploaded file is not valid.',
                'printify_images.*.image' => 'The file must be an image (PNG, JPEG, or JPG).',
                'printify_images.*.mimes' => 'The design image must be a PNG, JPEG, or JPG file.',
                'printify_images.*.max' => 'The design image size must not exceed 1MB (Printify requirement). Please compress or resize your image.',
            ]);
        }

        $validated = $request->validate($rules, $messages);

        if (! $isPrintifyProduct && in_array($pricingModel, ['fixed', 'offer'], true)) {
            $marginInput = $request->input('profit_margin_percentage');
            $hasMargin = $marginInput !== null && $marginInput !== '';

            if ($hasMargin && $request->filled('source_cost')) {
                $costBase = (float) $request->input('source_cost');
                if ($costBase >= 0) {
                    $validated['unit_price'] = round($costBase * (1 + ((float) $marginInput) / 100), 2);
                }
            }
        }

        $validated = $this->normalizeValidatedManualPhysicalShipFrom($validated, $isPrintifyProduct);

        try {
            $imagePath = null;
            if ($request->hasFile('image')) {
                $image = $request->file('image');
                $imageName = time().'_'.$image->getClientOriginalName();
                $imagePath = $image->storeAs('products', $imageName, 'public');
            }

            $categories = $validated['categories'] ?? [];
            unset($validated['categories']);
            unset($validated['product_source_type']);

            // Handle Printify product creation
            $printifyProductId = null;
            $printifyBlueprintId = null;
            $printifyProviderId = null;

            if ($isPrintifyProduct && $request->printify_blueprint_id) {
                // Get selected variant IDs from the request
                $selectedVariantIds = array_column($request->input('printify_variants', []), 'id');

                // Step 1: Create product with selected variants
                $printifyProductId = $this->createPrintifyProduct($request, $validated, $selectedVariantIds);

                if (! $printifyProductId) {
                    throw new \Exception('Failed to create Printify product');
                }

                // Step 2: Get product details to read real cost
                $productDetails = $this->printifyService->getProduct($printifyProductId);

                if (! $productDetails || ! isset($productDetails['variants'])) {
                    throw new \Exception('Failed to fetch product details');
                }

                // Step 3: Update with correct pricing for ALL variants — selling price = cost × (1 + markup%)
                $profitMargin = (float) ($validated['profit_margin_percentage'] ?? config('app.printify_profit_margin', 25));

                // Build updated variants - update ALL variants in the product
                $updatedVariants = [];
                $allVariantIds = [];

                foreach ($productDetails['variants'] as $variant) {
                    $allVariantIds[] = $variant['id'];

                    // Check if this variant is in our selected list
                    $isSelected = in_array($variant['id'], $selectedVariantIds);

                    $costInCents = $variant['cost'] ?? 0;

                    // Selling price (cents) = cost × (1 + markup/100)
                    $sellingPriceInCents = (int) round($costInCents * (1 + $profitMargin / 100));

                    $updatedVariants[] = [
                        'id' => $variant['id'],
                        'price' => $sellingPriceInCents,
                        'is_enabled' => $isSelected, // Only enable selected variants
                    ];

                    \Log::info('Prepared variant for update', [
                        'variant_id' => $variant['id'],
                        'is_selected' => $isSelected,
                        'cost_in_cents' => $costInCents,
                        'profit_margin_percent' => $profitMargin,
                        'selling_price_in_cents' => $sellingPriceInCents,
                    ]);
                }

                // CRITICAL FIX: Include ALL variant IDs in print_areas
                $updatePayload = [
                    'title' => $validated['name'],
                    'description' => $validated['description'],
                    'variants' => $updatedVariants,
                    'print_areas' => [
                        [
                            'variant_ids' => $allVariantIds, // ALL variants that exist in the product
                            'placeholders' => [
                                [
                                    'position' => 'front',
                                    'images' => $this->preparePrintifyImages($request->file('printify_images') ?? []),
                                ],
                            ],
                        ],
                    ],
                ];

                // Update the product
                $updateResponse = $this->printifyService->updateProduct($printifyProductId, $updatePayload);

                if (isset($updateResponse['status']) && $updateResponse['status'] === 'error') {
                    \Log::error('Printify update failed', [
                        'payload' => $updatePayload,
                        'response' => $updateResponse,
                    ]);
                    throw new \Exception('Printify update failed: '.$updateResponse['message']);
                }

                \Log::info('Printify product updated successfully', [
                    'product_id' => $printifyProductId,
                    'total_variants' => count($updatedVariants),
                    'enabled_variants' => count($selectedVariantIds),
                ]);
            }

            // Prepare product data
            $productData = [
                'user_id' => Auth::id(),
                'image' => $imagePath,
                'quantity_available' => $validated['quantity'],
            ];

            // Add Printify fields only if it's a Printify product
            if ($isPrintifyProduct) {
                $productData['printify_product_id'] = $printifyProductId;
                $productData['printify_blueprint_id'] = $request->printify_blueprint_id;
                $productData['printify_provider_id'] = $request->printify_provider_id;
                $productData['profit_margin_percentage'] = (float) ($validated['profit_margin_percentage'] ?? config('app.printify_profit_margin', 25));
            } else {
                // For manual products: unit price only; shipping comes from Shippo when the customer checks out
                $productData['unit_price'] = $validated['unit_price'] ?? 0;
                $productData['shipping_charge'] = null;

                $manualMargin = $request->input('profit_margin_percentage');
                $productData['profit_margin_percentage'] = ($manualMargin !== null && $manualMargin !== '')
                    ? (float) $manualMargin
                    : (float) config('app.printify_profit_margin', 25);

                if ($request->filled('source_cost')) {
                    $productData['source_cost'] = (float) $request->input('source_cost');
                }
            }

            // Bidding fields
            $productData['pricing_model'] = $pricingModel;
            if ($pricingModel === 'auction') {
                $productData['starting_bid'] = $validated['starting_bid'] ?? null;
                $productData['reserve_price'] = $validated['reserve_price'] ?? null;
                $productData['buy_now_price'] = $validated['buy_now_price'] ?? null;
                $productData['bid_increment'] = $validated['bid_increment'] ?? null;
                $productData['auction_start'] = $validated['auction_start'] ?? null;
                $productData['auction_end'] = $validated['auction_end'] ?? null;
                $productData['auto_extend'] = $request->boolean('auto_extend', false);
            }
            if ($pricingModel === 'blind_bid') {
                $productData['blind_bid_type'] = $validated['blind_bid_type'] ?? 'sealed';
                $productData['min_bid'] = $validated['min_bid'] ?? null;
                $productData['reserve_price'] = $validated['reserve_price'] ?? null;
                $productData['bid_deadline'] = $validated['bid_deadline'] ?? null;
                $productData['winner_notification'] = $validated['winner_notification'] ?? 'email,in_app';
                $productData['winner_payment_window'] = $validated['winner_payment_window'] ?? '24h';
                $productData['offer_to_next_if_unpaid'] = $request->boolean('offer_to_next_if_unpaid', true);
            }

            // Merge with validated data
            $productData = array_merge($validated, $productData);

            $product = Product::create($productData);
            $product->categories()->sync($categories);

            if (in_array(Auth::user()->role, ['organization', 'organization_pending'], true)) {
                $organization = Organization::where('user_id', Auth::id())->first();
                if ($organization) {
                    $product->update([
                        'owned_by' => 'organization',
                        'organization_id' => $organization->id,
                    ]);
                }
            }

            // Create ProductVariant records only for Printify products
            if ($isPrintifyProduct && $request->printify_variants) {
                foreach ($request->printify_variants as $variant) {
                    ProductVariant::create([
                        'product_id' => $product->id,
                        'printify_variant_id' => $variant['id'],
                        'is_available' => true,
                    ]);
                }
            }

            // Auto-publish if status is active and it's a Printify product
            if ($product->printify_product_id && $validated['status'] === 'active') {
                $this->autoPublishPrintifyProduct($product);
                $product->update([
                    'publish_status' => 'publishing',
                ]);
            }

            $productType = $isPrintifyProduct ? 'Printify' : 'manual';

            return redirect()->route('products.index')
                ->with('success', ucfirst($productType).' product created successfully'.($printifyProductId ? ' in Printify' : ''));

        } catch (\Exception $e) {
            return back()->withErrors(['printify_error' => 'Failed to create product: '.$e->getMessage()]);
        }
    }

    /**
     * Create product in Printify - UPDATED VERSION
     */
    private function createPrintifyProduct(Request $request, array $validated, array $selectedVariantIds): ?string
    {
        // Use a temporary price for initial creation
        $tempPrice = 100; // $1 in cents

        $printifyData = [
            'title' => $validated['name'],
            'description' => $validated['description'],
            'blueprint_id' => (int) $request->printify_blueprint_id,
            'print_provider_id' => (int) $request->printify_provider_id,
            'variants' => array_map(function ($variantId) use ($tempPrice) {
                return [
                    'id' => (int) $variantId,
                    'price' => $tempPrice,
                    'is_enabled' => true,
                ];
            }, $selectedVariantIds),
            'print_areas' => [
                [
                    'variant_ids' => $selectedVariantIds,
                    'placeholders' => [
                        [
                            'position' => 'front',
                            'images' => $this->preparePrintifyImages($request->printify_images ?? []),
                        ],
                    ],
                ],
            ],
        ];

        $printifyProduct = $this->printifyService->createProduct($printifyData);

        return $printifyProduct['id'] ?? null;
    }

    /**
     * Create product in Printify - FIXED VERSION
     */
    // private function createPrintifyProduct(Request $request, array $validated, float $unitSellingPrice): ?string
    // {
    //     // Use the shop ID from config instead of organization
    //     $printifyData = [
    //         'title' => $validated['name'],
    //         'description' => $validated['description'],
    //         'blueprint_id' => (int) $request->printify_blueprint_id,
    //         'print_provider_id' => (int) $request->printify_provider_id,
    //         'variants' => $this->preparePrintifyVariants($validated['printify_variants'] ?? [], $unitSellingPrice),
    //         'print_areas' => [
    //             [
    //                 'variant_ids' => array_column($request->printify_variants ?? [], 'id'),
    //                 'placeholders' => [
    //                     [
    //                         'position' => 'front',
    //                         'images' => $this->preparePrintifyImages($request->printify_images ?? [])
    //                     ]
    //                 ]
    //             ]
    //         ]
    //     ];

    //     $printifyProduct = $this->printifyService->createProduct($printifyData);

    //     return $printifyProduct['id'] ?? null;
    // }

    private function calculateSellingPrice(int $cost, int $profitPercentage)
    {
        return $cost + ($cost * $profitPercentage / 100);
    }

    /**
     * Prepare variants for Printify API
     */
    private function preparePrintifyVariants(array $variants, int $price): array
    {
        return array_map(function ($variant) use ($price) {
            return [
                'id' => (int) $variant['id'],
                'price' => (int) ($price * 100), // Convert to cents
                'enabled' => $variant['enabled'] ?? true,
            ];
        }, $variants);
    }

    /**
     * Prepare images for Printify API with upload
     */
    private function preparePrintifyImages(array $images): array
    {
        $preparedImages = [];

        foreach ($images as $imageUrl) {
            if (empty($imageUrl)) {
                continue;
            }

            $filename = time().'_'.uniqid().'.'.$imageUrl->getClientOriginalExtension();
            $path = $imageUrl->storeAs('designs', $filename, 'public');
            $fullUrl = asset('storage/'.$path);

            try {

                if (env('APP_ENV') === 'local') {
                    // ফাইলকে base64 করুন
                    $base64 = base64_encode(file_get_contents($imageUrl->getRealPath()));
                    $filename = pathinfo($imageUrl->getClientOriginalName(), PATHINFO_FILENAME);
                    $extension = strtolower($imageUrl->getClientOriginalExtension());

                    // গুরুত্বপূর্ণ: field name হবে "contents" (content না)
                    $payload = [
                        'file_name' => $filename.'.'.$extension,
                        'contents' => $base64,  // এখানে contents হবে, content না
                    ];

                    $uploadResult = \Http::withToken(config('printify.api_key'))
                        ->withHeaders([
                            'Accept' => 'application/json',
                        ])
                        ->post('https://api.printify.com/v1/uploads/images.json', $payload)
                        ->throw()
                        ->json();
                } else {
                    // First upload the image to Printify
                    $uploadResult = $this->printifyService->uploadImage($fullUrl);
                }

                if (! isset($uploadResult['id'])) {
                    throw new \Exception('Failed to get image ID from Printify upload');
                }

                $preparedImages[] = [
                    'id' => $uploadResult['id'], // Use the Printify image ID
                    'x' => 0.5,
                    'y' => 0.5,
                    'scale' => 1,
                    'angle' => 0,
                    'url' => $imageUrl,
                ];

            } catch (\Exception $e) {
                \Log::error('Failed to prepare Printify image', [
                    'image_url' => $imageUrl,
                    'error' => $e->getMessage(),
                ]);
                throw new \Exception("Failed to process image: {$imageUrl}. ".$e->getMessage());
            }
        }

        if (empty($preparedImages)) {
            throw new \Exception('No valid images could be processed');
        }

        return $preparedImages;
    }

    /**
     * @return \Illuminate\Support\Collection<int, array{id: int, name: string}>
     */
    private function categoriesForProductForm()
    {
        return Category::query()
            ->where('status', 'active')
            ->parents()
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (Category $c) => [
                'id' => $c->id,
                'name' => $c->name,
            ])
            ->values();
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Request $request, int $id): Response
    {
        $this->authorizePermission($request, 'product.edit');

        $product = Product::with(['categories', 'shipFromMerchant'])->findOrFail($id);
        $categories = $this->categoriesForProductForm();
        $organizations = Organization::all(['id', 'name']);
        $merchantsForShipFrom = $this->merchantsForShipFromPicker();
        $selectedCategories = $product->categories()->pluck('categories.id')->toArray();

        $printifyData = [];
        $printifyProvider = [];
        if ($product->printify_product_id) {
            try {
                $printifyResponse = $this->printifyService->getProduct($product->printify_product_id);

                if ($printifyResponse && isset($printifyResponse['id'])) { // Check if response has product data
                    $printifyData = $printifyResponse;

                    // Get provider information - CORRECT THE KEY
                    if (isset($printifyData['print_provider_id'])) {
                        $providerResponse = $this->printifyService->getProvider($printifyData['print_provider_id']);
                        if ($providerResponse) {
                            $printifyProvider = $providerResponse;
                        }
                    }
                }
            } catch (\Exception $e) {
                \Log::error('Failed to fetch Printify product data: '.$e->getMessage());
            }
        }

        return Inertia::render('products/edit', [
            'product' => $product,
            'categories' => $categories,
            'selectedCategories' => $selectedCategories,
            'organizations' => $organizations,
            'merchants_for_ship_from' => $merchantsForShipFrom,
            'is_printify_product' => (bool) $product->printify_product_id,
            'printify_data' => $printifyData,
            'printify_provider' => $printifyProvider,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Product $product)
    {
        $this->authorizePermission($request, 'product.update');

        if ($product->user_id !== Auth::id()) {
            abort(403, 'Unauthorized action.');
        }

        $isPrintifyProduct = (bool) $product->printify_product_id;

        $categoryExistsRule = Rule::exists('categories', 'id')->where(fn ($q) => $q->whereNull('parent_id')->where('status', 'active'));

        $sharedMessages = [
            'categories.required' => 'Select at least one product category.',
            'categories.min' => 'Select at least one product category.',
        ];

        $rules = [
            'quantity' => 'required|integer|min:0',
            'status' => 'required|in:active,inactive,archived',
            'categories' => ['required', 'array', 'min:1'],
            'categories.*' => ['integer', $categoryExistsRule],
        ];

        if (! $isPrintifyProduct && $product->type === 'physical') {
            $rules['ship_from_mode'] = ['required', Rule::in(['custom', 'merchant'])];
            $rules['ship_from_merchant_id'] = [
                'nullable',
                'integer',
                Rule::exists('merchants', 'id')->where('status', 'active'),
            ];
            $rules['ship_from_name'] = ['nullable', 'string', 'max:100'];
            $rules['ship_from_street1'] = ['nullable', 'string', 'max:255'];
            $rules['ship_from_city'] = ['nullable', 'string', 'max:100'];
            $rules['ship_from_state'] = ['nullable', 'string', 'max:50'];
            $rules['ship_from_zip'] = ['nullable', 'string', 'max:20'];
            $rules['ship_from_country'] = ['nullable', 'string', 'max:2'];
            $rules['parcel_length_in'] = ['nullable', 'numeric', 'min:0.01', 'max:999'];
            $rules['parcel_width_in'] = ['nullable', 'numeric', 'min:0.01', 'max:999'];
            $rules['parcel_height_in'] = ['nullable', 'numeric', 'min:0.01', 'max:999'];
            $rules['parcel_weight_oz'] = ['nullable', 'numeric', 'min:0.01', 'max:99999'];
        }

        $validated = $request->validate($rules, array_merge($sharedMessages, [
            'ship_from_mode.required' => 'Choose how Shippo ship-from is set: custom address or merchant warehouse.',
        ]));

        if (! $isPrintifyProduct && $product->type === 'physical') {
            $validated['type'] = 'physical';
            $validated = $this->normalizeValidatedManualPhysicalShipFrom($validated, false);
        }

        try {
            if ($product->status === 'active' && $validated['status'] !== 'active') {
                return back()->withErrors(['status_error' => 'Cannot update status from active.']);
            }

            $categories = $validated['categories'] ?? [];
            unset($validated['categories']);

            $oldQuantity = $product->quantity;
            $newQuantity = (int) $validated['quantity'];
            $quantityDifference = $newQuantity - $oldQuantity;
            $newQuantityAvailable = $product->quantity_available + $quantityDifference;

            if ($newQuantityAvailable < 0) {
                return back()->withErrors(['quantity_error' => 'Cannot reduce quantity below ordered items.']);
            }

            $oldStatus = $product->status;
            $newStatus = $validated['status'];

            unset($validated['quantity'], $validated['status']);

            $data = [
                'quantity' => $newQuantity,
                'quantity_available' => $newQuantityAvailable,
                'status' => $newStatus,
            ];

            if (! $isPrintifyProduct && $product->type === 'physical') {
                foreach ([
                    'ship_from_merchant_id',
                    'ship_from_name',
                    'ship_from_street1',
                    'ship_from_city',
                    'ship_from_state',
                    'ship_from_zip',
                    'ship_from_country',
                    'parcel_length_in',
                    'parcel_width_in',
                    'parcel_height_in',
                    'parcel_weight_oz',
                ] as $key) {
                    if (array_key_exists($key, $validated)) {
                        $data[$key] = $validated[$key];
                    }
                }
            }

            $product->update($data);
            $product->categories()->sync($categories);

            if ($product->printify_product_id && $oldStatus !== $newStatus) {
                $this->handlePrintifyPublishStatus($product, $oldStatus, $newStatus);
            }

            $successMessage = 'Product updated successfully';
            if ($quantityDifference != 0) {
                $action = $quantityDifference > 0 ? 'increased' : 'decreased';
                $successMessage .= ". Quantity {$action} by ".abs($quantityDifference);
            }

            return redirect()->route('products.index')
                ->with('success', $successMessage);
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Failed to update product: '.$e->getMessage()]);
        }
    }

    /**
     * Handle Printify publish/unpublish based on status changes
     */
    private function handlePrintifyPublishStatus(Product $product, string $oldStatus, string $newStatus): void
    {
        try {
            // If status changed to active, publish the product
            if ($newStatus === 'active' && $oldStatus !== 'active') {
                $this->autoPublishPrintifyProduct($product);
            }
            // If status changed from active to inactive/archived, unpublish
            elseif (($newStatus === 'inactive' || $newStatus === 'archived') && $oldStatus === 'active') {
                $this->autoUnpublishPrintifyProduct($product);
            }
        } catch (\Exception $e) {
            \Log::error('Failed to handle Printify publish status', [
                'product_id' => $product->id,
                'printify_product_id' => $product->printify_product_id,
                'old_status' => $oldStatus,
                'new_status' => $newStatus,
                'error' => $e->getMessage(),
            ]);

            // Don't throw the error to prevent the whole update from failing
            // Just log it and continue
        }
    }

    /**
     * Auto-publish Printify product when status becomes active
     */
    private function autoPublishPrintifyProduct(Product $product): void
    {
        try {
            $publishResult = $this->printifyService->publishProduct($product->printify_product_id);

            if ($publishResult['success']) {
                \Log::info('Printify product auto-published', [
                    'product_id' => $product->id,
                    'printify_product_id' => $product->printify_product_id,
                ]);

                // Mark publishing as succeeded
                $this->printifyService->markPublishingSucceeded(
                    $product->printify_product_id,
                    $product->id,
                    route('product.show', $product->id) // Your product URL
                );
            } else {
                \Log::warning('Printify product auto-publish failed', [
                    'product_id' => $product->id,
                    'printify_product_id' => $product->printify_product_id,
                    'error' => $publishResult['error'] ?? 'Unknown error',
                ]);
            }
        } catch (\Exception $e) {
            \Log::error('Auto-publish Printify product failed', [
                'product_id' => $product->id,
                'printify_product_id' => $product->printify_product_id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Auto-unpublish Printify product when status becomes inactive/archived
     */
    private function autoUnpublishPrintifyProduct(Product $product): void
    {
        try {
            $unpublishResult = $this->printifyService->unpublishProduct($product->printify_product_id);

            if ($unpublishResult['success']) {
                \Log::info('Printify product auto-unpublished', [
                    'product_id' => $product->id,
                    'printify_product_id' => $product->printify_product_id,
                ]);
            } else {
                \Log::warning('Printify product auto-unpublish failed', [
                    'product_id' => $product->id,
                    'printify_product_id' => $product->printify_product_id,
                    'error' => $unpublishResult['error'] ?? 'Unknown error',
                ]);
            }
        } catch (\Exception $e) {
            \Log::error('Auto-unpublish Printify product failed', [
                'product_id' => $product->id,
                'printify_product_id' => $product->printify_product_id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Update product in Printify - FIXED VERSION
     */
    private function updatePrintifyProduct(Product $product, array $validated): void
    {
        // Use the shop ID from config instead of organization
        $printifyData = [
            'title' => $validated['name'],
            'description' => $validated['description'],
            // Add other fields that can be updated in Printify
        ];

        if ($product->printify_product_id) {
            $this->printifyService->updateProduct(
                $product->printify_product_id,
                $printifyData
            );
        }
    }

    /**
     * Sync products from Printify - FIXED VERSION
     */
    // public function syncFromPrintify(Request $request)
    // {
    //     $this->authorizePermission($request, 'product.create');

    //     try {
    //         // Use the shop ID from config
    //         $printifyProducts = $this->printifyService->getProducts();
    //         $syncedCount = 0;

    //         foreach ($printifyProducts['data'] as $printifyProduct) {
    //             $existingProduct = Product::where('printify_product_id', $printifyProduct['id'])->first();

    //             if (!$existingProduct) {
    //                 $organization = Organization::where('user_id', Auth::id())->first();

    //                 Product::create([
    //                     'user_id' => Auth::id(),
    //                     'organization_id' => $organization->id ?? null,
    //                     'name' => $printifyProduct['title'],
    //                     'description' => $printifyProduct['description'],
    //                     'quantity' => 100,
    //                     'quantity_available' => 100,
    //                     'unit_price' => $this->calculateSellingPrice($printifyProduct['variants']),
    //                     'owned_by' => 'organization',
    //                     'status' => 'active',
    //                     'sku' => 'PRINTIFY-' . $printifyProduct['id'],
    //                     'type' => 'physical',
    //                     'printify_product_id' => $printifyProduct['id'],
    //                     'printify_blueprint_id' => $printifyProduct['blueprint_id'],
    //                     'printify_provider_id' => $printifyProduct['print_provider_id'],
    //                 ]);
    //                 $syncedCount++;
    //             }
    //         }

    //         return redirect()->route('products.index')
    //             ->with('success', "Successfully synced {$syncedCount} products from Printify");

    //     } catch (\Exception $e) {
    //         return back()->withErrors(['printify_error' => 'Failed to sync products: ' . $e->getMessage()]);
    //     }
    // }

    // private function calculateSellingPrice($variants)
    // {
    //     if (empty($variants)) {
    //         return 29.99; // Default price
    //     }

    //     $prices = array_column($variants, 'price');
    //     $maxPrice = max($prices) / 100; // Convert from cents to dollars
    //     return $maxPrice * 1.5; // 50% markup
    // }

    /**
     * Place a bid on an auction or blind-bid product.
     */
    public function placeBid(Request $request, Product $product)
    {
        $request->validate([
            'bid_amount' => 'required|numeric|min:0',
            'address_line1' => 'required|string|max:255',
            'address_line2' => 'nullable|string|max:255',
            'zip' => 'required|string|max:20',
            'country' => 'required|string|max:2',
            'city' => 'required|string|max:100',
            'state' => 'nullable|string|max:50',
        ]);

        $user = $request->user();
        if (! $user) {
            return redirect()->route('login')->with('error', 'Please log in to place a bid.');
        }

        if (! $product->isBiddable()) {
            return back()->withErrors(['bid' => 'This product does not accept bids.']);
        }

        if ($product->hasWinner()) {
            return back()->withErrors(['bid' => 'Bidding has closed. A winner has been selected.']);
        }

        $deadline = $product->isAuction() ? $product->auction_end : $product->bid_deadline;
        if ($deadline && $deadline->isPast()) {
            return back()->withErrors(['bid' => 'Bidding has ended.']);
        }

        $minBid = $product->isAuction()
            ? ($product->getCurrentBidAmount() ?? (float) $product->starting_bid)
            : (float) $product->min_bid;
        $increment = $product->isAuction() && $product->bid_increment
            ? (float) $product->bid_increment
            : 1;

        $amount = (float) $request->bid_amount;
        if ($amount < $minBid) {
            return back()->withErrors([
                'bid' => 'Your bid must be at least $'.number_format($minBid, 2).'.',
            ]);
        }
        if ($product->isAuction() && $increment > 0 && abs(($amount - $minBid) % $increment) > 0.001) {
            return back()->withErrors([
                'bid' => 'Bid must be in increments of $'.number_format($increment, 2).'.',
            ]);
        }

        // For blind bid: one bid per user (or revisable if sealed_revisable)
        if ($product->isBlindBid()) {
            $existing = $product->bids()->where('user_id', $user->id)->whereIn('status', ['active', 'winning'])->first();
            if ($existing && $product->blind_bid_type !== 'sealed_revisable') {
                return back()->withErrors(['bid' => 'You have already submitted a bid.']);
            }
            if ($existing && $product->blind_bid_type === 'sealed_revisable') {
                $existing->update(['bid_amount' => $amount]);

                return back()->with('success', 'Your bid has been updated.');
            }
        }

        $city = trim((string) $request->city);
        $state = trim((string) ($request->state ?? ''));
        $countryIso = $this->shippoService->normalizeCountryToIso2(strtoupper((string) $request->country));
        $zip = trim((string) $request->zip);

        if ($city === '' || $zip === '') {
            return back()->withErrors([
                'bid' => 'Please provide city and postal/ZIP code for shipping.',
            ])->withInput();
        }

        $needsState = in_array($countryIso, ['US', 'CA', 'AU'], true);
        if ($needsState && $state === '') {
            return back()->withErrors([
                'bid' => 'Please provide state or province for this country.',
            ])->withInput();
        }

        Bid::create([
            'product_id' => $product->id,
            'user_id' => $user->id,
            'bid_amount' => $amount,
            'status' => 'active',
            'city' => $city,
            'state' => $state !== '' ? $state : null,
            'address_line1' => $request->address_line1,
            'address_line2' => $request->address_line2,
            'zip' => $zip,
            'country' => $countryIso,
        ]);

        return back()->with('success', 'Your bid has been placed.');
    }

    /**
     * Show bids for a given product (seller / admin view).
     */
    public function bidsIndex(Request $request, Product $product)
    {
        $user = $request->user();

        // Only allow admins or the organization that owns the product
        if (! $user || ($user->role !== 'admin' && $product->organization_id !== optional($user->organization)->id)) {
            abort(403, 'You are not allowed to view bids for this product.');
        }

        $bids = $product->bids()
            ->with('user:id,city,state')
            ->orderByDesc('submitted_at')
            ->orderByDesc('created_at')
            ->paginate(25)
            ->through(function (Bid $bid) {
                $city = $bid->city ?? $bid->user?->city;
                $state = $bid->state ?? $bid->user?->state;
                $location = trim(($city ?? '').($city && $state ? ', ' : '').($state ?? '')) ?: '—';

                return [
                    'id' => $bid->id,
                    'bid_amount' => (float) $bid->bid_amount,
                    'bid_amount_formatted' => '$'.number_format((float) $bid->bid_amount, 2),
                    'status' => $bid->status,
                    'submitted_at' => optional($bid->submitted_at ?? $bid->created_at)->toIso8601String(),
                    'location' => $location,
                ];
            });

        return Inertia::render('products/bids', [
            'product' => [
                'id' => $product->id,
                'name' => $product->name,
                'pricing_model' => $product->pricing_model,
                'has_winner' => $product->hasWinner(),
                'can_close_bidding' => $product->isBiddable() && ! $product->hasWinner(),
            ],
            'bids' => $bids,
        ]);
    }

    /**
     * Cancel a bid (mark as cancelled, do not delete) and notify all bidders.
     */
    public function cancelBid(Request $request, Product $product, Bid $bid)
    {
        $user = $request->user();

        // Only admins or the owning organization can cancel
        if (! $user || ($user->role !== 'admin' && $product->organization_id !== optional($user->organization)->id)) {
            abort(403, 'You are not allowed to cancel bids for this product.');
        }

        // Ensure the bid belongs to this product
        if ($bid->product_id !== $product->id) {
            abort(404);
        }

        // Cannot cancel a bid after a winner has been selected
        if ($product->hasWinner()) {
            return back()->withErrors(['bid' => 'Bids cannot be cancelled after a winner has been selected.']);
        }

        if ($bid->status === 'cancelled') {
            return back()->with('info', 'This bid is already cancelled.');
        }

        $bid->update(['status' => 'cancelled']);

        // Notify all users who have ever bid on this product
        $bidders = $product->bids()
            ->with('user')
            ->whereNotNull('user_id')
            ->get()
            ->pluck('user')
            ->filter()
            ->unique('id');

        if ($bidders->isNotEmpty()) {
            Notification::send($bidders, new BidCancelledNotification($product));
        }

        return back()->with('success', 'Bid has been cancelled and bidders have been notified.');
    }

    /**
     * Close bidding and select winner (seller/admin). Winner and others are notified.
     */
    public function closeBidding(Request $request, Product $product)
    {
        $user = $request->user();
        if (! $user || ($user->role !== 'admin' && $product->organization_id !== optional($user->organization)->id)) {
            abort(403, 'You are not allowed to close bidding for this product.');
        }
        if (! $product->isBiddable()) {
            return back()->withErrors(['bid' => 'This product does not accept bids.']);
        }
        if ($product->hasWinner()) {
            return back()->with('info', 'Bidding is already closed and a winner was selected.');
        }

        $reserve = $product->reserve_price ? (float) $product->reserve_price : null;
        $winningBid = $product->bids()
            ->whereNot('status', 'cancelled')
            ->whereIn('status', ['active', 'winning'])
            ->when($reserve !== null, fn ($q) => $q->where('bid_amount', '>=', $reserve))
            ->orderByDesc('bid_amount')
            ->orderBy('submitted_at')
            ->first();

        if (! $winningBid) {
            $product->bids()->whereIn('status', ['active', 'winning'])->update(['status' => 'lost']);

            return back()->with('info', 'No valid winning bid (none met reserve price if set). All bidders marked as lost.');
        }

        \DB::transaction(function () use ($product, $winningBid) {
            $product->bids()->where('id', '!=', $winningBid->id)->whereIn('status', ['active', 'winning'])->update(['status' => 'lost']);
            $winningBid->update(['status' => 'winning']);

            $window = $product->winner_payment_window ?? '48h';
            $hours = (int) preg_replace('/[^0-9]/', '', $window) ?: 48;
            if (stripos($window, '24') !== false) {
                $hours = 24;
            } elseif (stripos($window, '72') !== false) {
                $hours = 72;
            }
            $deadline = now()->addHours($hours);

            $product->update([
                'winner_user_id' => $winningBid->user_id,
                'winning_bid_id' => $winningBid->id,
                'winner_payment_deadline' => $deadline,
                'winner_status' => 'pending_payment',
            ]);

            $winner = $winningBid->user;
            if ($winner) {
                Notification::send($winner, new BidWonNotification(
                    $product,
                    (float) $winningBid->bid_amount,
                    $deadline->toFormattedDateString()
                ));
            }
            $losers = $product->bids()->where('user_id', '!=', $winningBid->user_id)->whereNotNull('user_id')->get()->pluck('user')->filter()->unique('id');
            if ($losers->isNotEmpty()) {
                Notification::send($losers, new BidLostNotification($product));
            }
        });

        return back()->with('success', 'Bidding closed. Winner has been notified to pay.');
    }

    /**
     * Seller manually picks a bid as winner (instead of auto-highest).
     */
    public function pickWinner(Request $request, Product $product, Bid $bid)
    {
        $user = $request->user();
        if (! $user || ($user->role !== 'admin' && $product->organization_id !== optional($user->organization)->id)) {
            abort(403, 'You are not allowed to pick a winner for this product.');
        }
        if (! $product->isBiddable()) {
            return back()->withErrors(['bid' => 'This product does not accept bids.']);
        }
        if ($product->hasWinner()) {
            return back()->with('info', 'A winner has already been selected.');
        }
        if ($bid->product_id != $product->id) {
            abort(404);
        }
        if (! in_array($bid->status, ['active', 'winning'])) {
            return back()->withErrors(['bid' => 'This bid cannot be selected as winner.']);
        }

        \DB::transaction(function () use ($product, $bid) {
            $product->bids()->where('id', '!=', $bid->id)->whereIn('status', ['active', 'winning'])->update(['status' => 'lost']);
            $bid->update(['status' => 'winning']);

            $window = $product->winner_payment_window ?? '48h';
            $hours = (int) preg_replace('/[^0-9]/', '', $window) ?: 48;
            if (stripos($window, '24') !== false) {
                $hours = 24;
            } elseif (stripos($window, '72') !== false) {
                $hours = 72;
            }
            $deadline = now()->addHours($hours);

            $product->update([
                'winner_user_id' => $bid->user_id,
                'winning_bid_id' => $bid->id,
                'winner_payment_deadline' => $deadline,
                'winner_status' => 'pending_payment',
            ]);

            $winner = $bid->user;
            if ($winner) {
                Notification::send($winner, new BidWonNotification(
                    $product,
                    (float) $bid->bid_amount,
                    $deadline->toFormattedDateString()
                ));
            }
            $losers = $product->bids()->where('user_id', '!=', $bid->user_id)->whereNotNull('user_id')->get()->pluck('user')->filter()->unique('id');
            if ($losers->isNotEmpty()) {
                Notification::send($losers, new BidLostNotification($product));
            }
        });

        return back()->with('success', 'Winner selected. They have been notified to pay.');
    }

    /**
     * Winner chooses a Shippo-backed shipping option before Stripe Checkout (manual / physical).
     */
    public function winningBidShipping(Request $request, Product $product): Response|RedirectResponse
    {
        $user = $request->user();
        if (! $user instanceof User) {
            abort(403);
        }
        if ($product->winner_user_id != $user->id || $product->winner_status !== 'pending_payment') {
            abort(403, 'You are not the winner or payment is not pending.');
        }
        $winningBid = $product->winningBid;
        if (! $winningBid) {
            abort(404, 'Winning bid not found.');
        }

        $quote = $this->winningBidQuotedShippingMethods($product, $winningBid, $user);
        if (! ($quote['success'] ?? false)) {
            return redirect()->route('user.profile.bid-wins')
                ->with('error', $quote['error'] ?? 'Shipping could not be calculated.');
        }

        $bidAmount = (float) $winningBid->bid_amount;
        $stateCode = strtoupper(trim((string) ($winningBid->state ?? '')));
        $taxRow = StateSalesTax::where('state_code', $stateCode)->first();
        $taxAmount = $taxRow ? round(($bidAmount * (float) $taxRow->base_sales_tax_rate) / 100, 2) : 0.0;

        return Inertia::render('frontend/winning-bid-shipping', [
            'product' => [
                'id' => $product->id,
                'name' => $product->name,
                'image' => $product->image,
            ],
            'bid_amount' => $bidAmount,
            'bid_amount_formatted' => '$'.number_format($bidAmount, 2),
            'estimated_tax' => $taxAmount,
            'payment_deadline' => $product->winner_payment_deadline?->toIso8601String(),
            'shipping_methods' => $quote['methods'],
        ]);
    }

    /**
     * JSON: Shippo shipping options for the winning bid (used on /profile/bid-wins per item).
     */
    public function winningBidShippingRatesJson(Request $request, Product $product): JsonResponse
    {
        $user = $request->user();
        if (! $user instanceof User) {
            return response()->json(['success' => false, 'error' => 'Unauthorized.'], 403);
        }
        if ($product->winner_user_id != $user->id || $product->winner_status !== 'pending_payment') {
            return response()->json(['success' => false, 'error' => 'Not eligible for payment.'], 403);
        }
        $winningBid = $product->winningBid;
        if (! $winningBid) {
            return response()->json(['success' => false, 'error' => 'Winning bid not found.'], 404);
        }

        if ($request->boolean('refresh')) {
            $winningBid->forceFill(['shippo_shipment_id' => null])->save();
            $winningBid->refresh();
        }

        $quote = $this->winningBidQuotedShippingMethods($product, $winningBid, $user);
        if (! ($quote['success'] ?? false)) {
            return response()->json([
                'success' => false,
                'error' => $quote['error'] ?? 'Could not get shipping rates.',
            ], 422);
        }

        $bidAmount = (float) $winningBid->bid_amount;
        $stateCode = strtoupper(trim((string) ($winningBid->state ?? '')));
        $taxRow = StateSalesTax::where('state_code', $stateCode)->first();
        $estimatedTax = $taxRow ? round(($bidAmount * (float) $taxRow->base_sales_tax_rate) / 100, 2) : 0.0;

        return response()->json([
            'success' => true,
            'shipping_methods' => $quote['methods'],
            'bid_amount' => $bidAmount,
            'estimated_tax' => $estimatedTax,
        ]);
    }

    /**
     * Create Stripe Checkout session after the winner selects a Shippo rate.
     */
    public function createWinningBidCheckout(Request $request, Product $product)
    {
        $validated = $request->validate([
            'shippo_rate_object_id' => ['required', 'string', 'max:120'],
        ]);

        $user = $request->user();
        if (! $user instanceof User) {
            abort(403);
        }
        if ($product->winner_user_id != $user->id || $product->winner_status !== 'pending_payment') {
            abort(403, 'You are not the winner or payment is not pending.');
        }
        $winningBid = $product->winningBid;
        if (! $winningBid) {
            abort(404, 'Winning bid not found.');
        }

        $quote = $this->winningBidQuotedShippingMethods($product, $winningBid, $user);
        if (! ($quote['success'] ?? false)) {
            return response()->json([
                'message' => $quote['error'] ?? 'Could not get shipping rates.',
            ], 422);
        }

        $selectedId = (string) $validated['shippo_rate_object_id'];
        $picked = collect($quote['methods'])->first(function ($m) use ($selectedId) {
            return (string) ($m['id'] ?? '') === $selectedId;
        });
        if (! $picked) {
            return response()->json([
                'message' => 'This shipping option is no longer available. Refresh the page and try again.',
            ], 422);
        }

        $bidAmount = (float) $winningBid->bid_amount;
        $shippingCost = (float) $picked['cost'];

        // LEGACY: StateSalesTax table — skipped when Stripe Checkout automatic tax is enabled.
        $taxAmount = 0.0;
        if (! StripeAutomaticTax::enabled()) {
            $stateCode = strtoupper(trim((string) ($winningBid->state ?? '')));
            $taxRow = StateSalesTax::where('state_code', $stateCode)->first();
            $taxAmount = $taxRow ? round(($bidAmount * (float) $taxRow->base_sales_tax_rate) / 100, 2) : 0.0;
        }

        $totalAmount = $bidAmount + $shippingCost + $taxAmount;
        $amountCents = StripeCustomerChargeAmount::chargeCentsFromNetUsd($totalAmount, 'card');
        if ($amountCents < 50) {
            $amountCents = 50;
        }

        $winningBid->update([
            'shippo_rate_object_id' => (string) $picked['id'],
            'shippo_shipping_cost' => $shippingCost,
            'shippo_tax_amount' => $taxAmount,
            'shippo_carrier' => $picked['provider'] ?? null,
            'shippo_currency' => $picked['currency'] ?? 'USD',
        ]);

        $checkoutOptions = StripeAutomaticTax::mergeCheckoutOptions([
            'success_url' => route('products.winning-bid.success', ['product' => $product->id]).'?session_id={CHECKOUT_SESSION_ID}',
            'cancel_url' => route('user.profile.bid-wins'),
            'metadata' => [
                'product_id' => (string) $product->id,
                'winning_bid_id' => (string) $winningBid->id,
                'user_id' => (string) $user->id,
                'type' => 'winning_bid',
                'shippo_rate_object_id' => (string) $picked['id'],
                'shipping_cost' => (string) $shippingCost,
                'tax_amount' => (string) $taxAmount,
            ],
            'payment_method_types' => ['card'],
        ]);
        $checkout = $user->checkoutCharge(
            $amountCents,
            'Winning bid: '.$product->name,
            1,
            $checkoutOptions
        );

        // JSON + full browser navigation — Inertia::location() after router.post does not reliably open Stripe Checkout.
        return response()->json([
            'redirect' => $checkout->url,
        ]);
    }

    /**
     * Success callback after winner pays via Stripe. Create order and mark winner as paid.
     */
    public function winningBidPaymentSuccess(Request $request, Product $product)
    {
        $sessionId = $request->get('session_id');
        if (! $sessionId) {
            return redirect()->route('user.profile.bid-wins')->with('error', 'Invalid session.');
        }
        $stripe = Cashier::stripe();
        $session = $stripe->checkout->sessions->retrieve($sessionId);
        if ($session->payment_status !== 'paid' || ($session->metadata->type ?? '') !== 'winning_bid' || (string) $session->metadata->product_id !== (string) $product->id) {
            return redirect()->route('user.profile.bid-wins')->with('error', 'Payment could not be verified.');
        }
        $user = \App\Models\User::find($session->metadata->user_id ?? 0);
        if (! $user || $product->winner_user_id != $user->id || $product->winner_status !== 'pending_payment') {
            return redirect()->route('user.profile.bid-wins')->with('error', 'Invalid winner or status.');
        }
        $winningBid = $product->winningBid;
        if (! $winningBid) {
            return redirect()->route('user.profile.bid-wins')->with('error', 'Winning bid not found.');
        }
        \DB::beginTransaction();
        try {
            $amount = (float) $winningBid->bid_amount;
            $shippingCost = (float) ($winningBid->shippo_shipping_cost ?? 0);
            $stripeTaxCents = (int) ($session->total_details->amount_tax ?? 0);
            $taxAmount = $stripeTaxCents > 0
                ? round($stripeTaxCents / 100, 2)
                : (float) ($winningBid->shippo_tax_amount ?? 0);
            $totalAmount = $amount + $shippingCost + $taxAmount;

            if (empty($winningBid->address_line1) || empty($winningBid->zip) || empty($winningBid->country)) {
                abort(422, 'Winner shipping address is missing.');
            }

            $ref = 'ORD-BID-'.$product->id.'-'.strtoupper(Str::random(6));
            $order = Order::create([
                'user_id' => $user->id,
                'organization_id' => $product->organization_id,
                'reference_number' => $ref,
                'subtotal' => $amount,
                'total_amount' => $totalAmount,
                'shipping_cost' => $shippingCost,
                'tax_amount' => $taxAmount,
                'stripe_tax_amount' => $stripeTaxCents > 0 ? round($stripeTaxCents / 100, 2) : null,
                'platform_fee' => BiuPlatformFeeService::platformFeeFromAmount($amount),
                'donation_amount' => 0,
                'status' => 'processing',
                'payment_status' => 'paid',
                'payment_method' => 'stripe',
                'stripe_payment_intent_id' => is_string($session->payment_intent ?? null)
                    ? $session->payment_intent
                    : (is_object($session->payment_intent ?? null) ? ($session->payment_intent->id ?? null) : null),
            ]);

            // Create shipping info for Shippo label generation
            $nameParts = explode(' ', trim((string) $user->name));
            $firstName = $nameParts[0] ?? 'Customer';
            $lastName = count($nameParts) > 1 ? implode(' ', array_slice($nameParts, 1)) : '';
            OrderShippingInfo::create([
                'order_id' => $order->id,
                'first_name' => $firstName,
                'last_name' => $lastName,
                'email' => $user->email,
                'phone' => $user->contact_number,
                'shipping_address' => (string) $winningBid->address_line1,
                'shipping_address_line2' => $winningBid->address_line2 ? (string) $winningBid->address_line2 : null,
                'city' => $winningBid->city,
                'state' => $winningBid->state,
                'zip' => $winningBid->zip,
                'country' => strtoupper($winningBid->country),
            ]);

            OrderItem::create([
                'order_id' => $order->id,
                'product_id' => $product->id,
                'organization_id' => $product->organization_id,
                'quantity' => 1,
                'unit_price' => $amount,
                'subtotal' => $amount,
                'primary_image' => $product->image,
            ]);

            // Auto-create Shippo label immediately after payment success
            if ($this->shippoService->isConfigured() && empty($order->printify_order_id) && ! empty($winningBid->shippo_rate_object_id)) {
                $shippoResult = $this->shippoService->purchaseLabel((string) $winningBid->shippo_rate_object_id);
                if (($shippoResult['success'] ?? false) === true) {
                    $order->update([
                        'shippo_transaction_id' => $shippoResult['transaction_id'] ?? null,
                        'tracking_number' => $shippoResult['tracking_number'] ?? null,
                        'tracking_url' => $shippoResult['tracking_url'] ?? null,
                        'label_url' => $shippoResult['label_url'] ?? null,
                        'carrier' => $shippoResult['carrier'] ?? null,
                        'shipping_status' => 'label_created',
                    ]);

                    $order->load(['items.product', 'shippingInfo']);
                    $parcel = $this->shippoService->getParcelSnapshot($order);
                    $shippingInfo = $order->shippingInfo;
                    $shipToName = trim(($shippingInfo?->first_name ?? '').' '.($shippingInfo?->last_name ?? ''));
                    $shipLines = $shippingInfo ? $this->shippoService->splitOrderShippingStreetLines($shippingInfo) : ['street1' => '', 'street2' => ''];

                    ShippoShipment::updateOrCreate(
                        ['order_id' => $order->id, 'product_type' => 'manual'],
                        [
                            'shippo_shipment_id' => null,
                            'selected_rate_object_id' => (string) $winningBid->shippo_rate_object_id,
                            'shippo_transaction_id' => $shippoResult['transaction_id'] ?? null,
                            'tracking_number' => $shippoResult['tracking_number'] ?? null,
                            'label_url' => $shippoResult['label_url'] ?? null,
                            'carrier' => $shippoResult['carrier'] ?? null,
                            'ship_to_name' => $shipToName ?: null,
                            'ship_to_street1' => $shipLines['street1'] ?: null,
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

            $product->update([
                'winner_status' => 'paid',
                'quantity_ordered' => $product->quantity_ordered + 1,
                'quantity_available' => max(0, $product->quantity_available - 1),
            ]);
            \DB::commit();

            try {
                $order->load('items');
                app(SupporterActivityService::class)->recordPurchasesForOrder($order);
            } catch (\Throwable $e) {
                \Log::warning('Supporter activity (purchase) failed', [
                    'order_id' => $order->id,
                    'error' => $e->getMessage(),
                ]);
            }

            return redirect()->route('user.profile.orders')->with('success', 'Payment complete. Your order has been placed.');
        } catch (\Exception $e) {
            \DB::rollBack();
            \Log::error('Winning bid payment success error: '.$e->getMessage());

            return redirect()->route('user.profile.bid-wins')->with('error', 'Failed to create order.');
        }
    }

    /**
     * Shippo rates for the winning bid ship-from / ship-to (reused on shipping page and checkout POST).
     *
     * @return array{success: bool, error?: string, methods?: array<int, array<string, mixed>>}
     */
    private function winningBidQuotedShippingMethods(Product $product, Bid $winningBid, User $user): array
    {
        if (empty($winningBid->address_line1) || empty($winningBid->zip) || empty($winningBid->country)) {
            return ['success' => false, 'error' => 'Shipping address is missing for this bid.'];
        }

        $organization = $product->organization;
        if (! $organization) {
            return ['success' => false, 'error' => 'Product organization is missing.'];
        }

        $organization->loadMissing('user');
        $product->loadMissing(['user', 'shipFromMerchant.shippingAddresses']);

        $shipFrom = $this->shippoService->shipFromForManualProduct($product, $organization);

        $countryIso = $this->shippoService->normalizeCountryToIso2((string) ($winningBid->country ?: 'US'));

        $shipTo = [
            'name' => $user->name ?: 'Customer',
            'street1' => $winningBid->address_line1,
            'street2' => $winningBid->address_line2 ?: '',
            'city' => $winningBid->city ?: ($user->city ?? ''),
            'state' => $winningBid->state ?: ($user->state ?? ''),
            'zip' => $winningBid->zip,
            'country' => $countryIso,
            'phone' => $this->shippoService->ensureRecipientPhoneForShippo($user->contact_number ?? null),
            'email' => $user->email ?: '',
        ];

        if (empty($shipTo['city']) || empty($shipTo['zip'])) {
            return ['success' => false, 'error' => 'Bid location is incomplete (city/zip).'];
        }

        $needsState = in_array($countryIso, ['US', 'CA', 'AU'], true);
        if ($needsState && trim((string) ($shipTo['state'] ?? '')) === '') {
            return ['success' => false, 'error' => 'Bid location is incomplete (state/region required for this country).'];
        }

        $length = $product->parcel_length_in !== null ? (float) $product->parcel_length_in : 10.0;
        $width = $product->parcel_width_in !== null ? (float) $product->parcel_width_in : 8.0;
        $height = $product->parcel_height_in !== null ? (float) $product->parcel_height_in : 4.0;
        $weight = $product->parcel_weight_oz !== null ? (float) $product->parcel_weight_oz : 16.0;
        if ($weight < 0.1) {
            $weight = 16.0;
        }

        if (! $this->shippoService->isConfigured()) {
            return ['success' => false, 'error' => 'Shippo is not configured.'];
        }

        $parcel = [
            'length' => (string) $length,
            'width' => (string) $width,
            'height' => (string) $height,
            'distance_unit' => 'in',
            'weight' => (string) $weight,
            'mass_unit' => 'oz',
        ];

        $ratesResult = null;

        // Reuse the same Shippo shipment as the rate list so rate object_ids still match at checkout.
        if (! empty($winningBid->shippo_shipment_id)) {
            $ratesResult = $this->shippoService->retrieveShipmentRates((string) $winningBid->shippo_shipment_id);
            if (! ($ratesResult['success'] ?? false) || empty($ratesResult['rates'])) {
                $ratesResult = null;
            }
        }

        if ($ratesResult === null) {
            $ratesResult = $this->shippoService->getRatesForAddresses($shipFrom, $shipTo, $parcel);
            if (! ($ratesResult['success'] ?? false) || empty($ratesResult['rates'])) {
                $err = $ratesResult['error'] ?? 'Could not retrieve shipping rates from Shippo.';

                return ['success' => false, 'error' => is_string($err) ? $err : 'Could not retrieve shipping rates from Shippo.'];
            }

            $winningBid->forceFill([
                'shippo_shipment_id' => $ratesResult['shipment_id'] ?? null,
            ])->save();
        }

        $methods = $this->shippoService->ratesToCheckoutMethods($ratesResult['rates']);
        if (empty($methods)) {
            return ['success' => false, 'error' => 'No valid Shippo rates available for this address.'];
        }

        return ['success' => true, 'methods' => $methods];
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, int $id)
    {
        $this->authorizePermission($request, 'product.delete');

        $product = Product::findOrFail($id);

        if ($product->user_id !== Auth::id()) {
            abort(403, 'Unauthorized action.');
        }

        try {
            // Delete from Printify if it exists
            if ($product->printify_product_id) {
                $this->printifyService->deleteProduct(
                    $product->printify_product_id
                );
            }

            $product->categories()->detach();
            $product->delete();

            return redirect()->route('products.index')
                ->with('success', 'Product deleted successfully'.($product->printify_product_id ? ' from Printify' : ''));

        } catch (\Exception $e) {
            return back()->withErrors(['printify_error' => 'Failed to delete product: '.$e->getMessage()]);
        }
    }
}
