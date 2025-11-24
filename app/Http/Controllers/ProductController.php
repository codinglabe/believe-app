<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;
use App\Models\Product;
use App\Models\Organization;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;
use App\Models\Category;
use App\Models\ProductVariant;
use App\Services\PrintifyService;

class ProductController extends BaseController
{
    protected $printifyService;

    public function __construct(PrintifyService $printifyService)
    {
        $this->printifyService = $printifyService;
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
        if (Auth::user()->role == "organization") {
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

        $categories = Category::all();
        $organizations = Organization::all(['id', 'name']);

        // Get Printify blueprints for product types
        $blueprints = [];
        if (Auth::user()->role === "admin" || Auth::user()->role === "organization") {
            try {
                $blueprints = $this->printifyService->getBlueprints();
            } catch (\Exception $e) {
                // Silently fail - user can still create regular products
            }
        }


        return Inertia::render('products/create', [
            'categories' => $categories,
            'organizations' => $organizations,
            'blueprints' => $blueprints,
            'printify_enabled' => !empty($blueprints),
        ]);
    }

    public function show($id): Response
    {
        $product = Product::with([
            'organization',
            'categories',
            'variants'
        ])->whereNotNull("printify_product_id")->findOrFail($id);

        // Check if product is available for marketplace
        if ($product->status !== 'active' || $product->quantity_available <= 0) {
            abort(404, 'Product not found');
        }

        $printifyProduct = null;
        $variantsWithImages = [];

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
                \Log::error('Error fetching Printify product: ' . $e->getMessage());
                // Fallback: আপনার database variants ব্যবহার করুন
                $variantsWithImages = $this->getDatabaseVariants($product);
            }
        }

        // Get first available variant
        $firstVariant = !empty($variantsWithImages) ? $variantsWithImages[0] : null;

        // dd($printifyProduct);

        return Inertia::render('frontend/product-view', [
            'product' => $product,
            'printifyProduct' => $printifyProduct,
            'variants' => $variantsWithImages,
            'firstVariant' => $firstVariant,
            'relatedProducts' => Product::query()
                ->where('id', '!=', $product->id)
                ->where('status', 'active')
                ->where('quantity_available', '>', 0)
                ->limit(4)
                ->get(),
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
            if (!empty($availableVariantIds) && !in_array($variant['id'], $availableVariantIds)) {
                continue;
            }

            if (!$variant['is_available']) {
                continue;
            }

            // Find images for this variant
            $variantImages = [];
            foreach ($images as $image) {
                if (in_array($variant['id'], $image['variant_ids'])) {
                    $variantImages[] = [
                        'src' => $image['src'],
                        'position' => $image['position'],
                        'is_default' => $image['is_default'] ?? false
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
                'primary_image' => !empty($variantImages) ? $variantImages[0]['src'] : null,
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
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $this->authorizePermission($request, 'product.create');

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'required|string|max:1000',
            'quantity' => 'required|integer|min:0',
            'unit_price' => 'required|numeric|min:0',
            'profit_margin_percentage' => 'required|numeric|min:0',
            'owned_by' => 'required|in:admin,organization',
            'organization_id' => 'nullable|integer|exists:organizations,id',
            'status' => 'required|in:active,inactive,archived',
            'sku' => 'required|string|max:255|unique:products,sku',
            'type' => 'required|in:digital,physical',
            'tags' => 'nullable|string',
            'categories' => 'array',
            'categories.*' => 'integer|exists:categories,id',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg',

            // Printify specific fields
            'is_printify_product' => 'nullable|boolean',
            'printify_blueprint_id' => 'nullable|integer',
            'printify_provider_id' => 'nullable|integer',
            'printify_variants' => 'nullable|array',
            'printify_images' => 'nullable|array',
        ]);

        try {
            $imagePath = null;
            if ($request->hasFile('image')) {
                $image = $request->file('image');
                $imageName = time() . '_' . $image->getClientOriginalName();
                $imagePath = $image->storeAs('products', $imageName, 'public');
            }

            $categories = $validated['categories'] ?? [];
            unset($validated['categories']);


            // Handle Printify product creation
            $printifyProductId = null;
            if ($request->boolean('is_printify_product') && $request->printify_blueprint_id) {
                $printifyProductId = $this->createPrintifyProduct($request, $validated);
            }

            $productData = [
                'user_id' => Auth::id(),
                'image' => $imagePath,
                'unit_price' => $this->calculateSellingPrice($validated['unit_price'], $validated['profit_margin_percentage']),
                'quantity_available' => $validated['quantity'],
                'printify_product_id' => $printifyProductId,
                'printify_blueprint_id' => $request->printify_blueprint_id,
                'printify_provider_id' => $request->printify_provider_id,
            ];

            // Merge with validated data
            $productData = array_merge($validated, $productData);

            $product = Product::create($productData);
            $product->categories()->sync($categories);

            if (Auth::user()->role == "organization") {
                $organization = Organization::where('user_id', Auth::id())->first();
                $product->update([
                    'owned_by' => 'organization',
                    'organization_id' => $organization->id,
                ]);
            }

            if($request->boolean('is_printify_product') && $request->printify_variants){
                    foreach ($request->printify_variants as $variant) {
                        ProductVariant::create([
                            'product_id' => $product->id,
                            'printify_variant_id' => $variant['id'],
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

            return redirect()->route('products.index')
                ->with('success', 'Product created successfully' . ($printifyProductId ? ' in Printify' : ''));

        } catch (\Exception $e) {
            return back()->withErrors(['printify_error' => 'Failed to create product: ' . $e->getMessage()]);
        }
    }

    /**
     * Create product in Printify - FIXED VERSION
     */
    private function createPrintifyProduct(Request $request, array $validated): ?string
    {
        $profitMarginPercentage = $validated['profit_margin_percentage'];
        $unitSellingPrice = $this->calculateSellingPrice($request->unit_price, $profitMarginPercentage);

        // Use the shop ID from config instead of organization
        $printifyData = [
            'title' => $validated['name'],
            'description' => $validated['description'],
            'blueprint_id' => (int) $request->printify_blueprint_id,
            'print_provider_id' => (int) $request->printify_provider_id,
            'variants' => $this->preparePrintifyVariants($request->printify_variants ?? [], $unitSellingPrice),
            'print_areas' => [
                [
                    'variant_ids' => array_column($request->printify_variants ?? [], 'id'),
                    'placeholders' => [
                        [
                            'position' => 'front',
                            'images' => $this->preparePrintifyImages($request->printify_images ?? [])
                        ]
                    ]
                ]
            ]
        ];

        $printifyProduct = $this->printifyService->createProduct($printifyData);

        return $printifyProduct['id'] ?? null;
    }


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

            try {
                // First upload the image to Printify
                $uploadResult = $this->printifyService->uploadImage($imageUrl);

                if (!isset($uploadResult['id'])) {
                    throw new \Exception('Failed to get image ID from Printify upload');
                }

                $preparedImages[] = [
                    'id' => $uploadResult['id'], // Use the Printify image ID
                    'x' => 0.5,
                    'y' => 0.5,
                    'scale' => 1,
                    'angle' => 0,
                    'url' => $imageUrl
                ];

            } catch (\Exception $e) {
                \Log::error('Failed to prepare Printify image', [
                    'image_url' => $imageUrl,
                    'error' => $e->getMessage()
                ]);
                throw new \Exception("Failed to process image: {$imageUrl}. " . $e->getMessage());
            }
        }

        if (empty($preparedImages)) {
            throw new \Exception('No valid images could be processed');
        }

        return $preparedImages;
    }


    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Request $request, int $id): Response
    {
        $this->authorizePermission($request, 'product.edit');

        $product = Product::with('categories')->findOrFail($id);
        $categories = Category::all();
        $organizations = Organization::all(['id', 'name']);
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
                \Log::error('Failed to fetch Printify product data: ' . $e->getMessage());
            }
        }

        return Inertia::render('products/edit', [
            'product' => $product,
            'categories' => $categories,
            'selectedCategories' => $selectedCategories,
            'organizations' => $organizations,
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

        // Only allow specific fields to be updated
        $validated = $request->validate([
            'quantity' => 'required|integer|min:0',
            'status' => 'required|in:active,inactive,archived',
            'categories' => 'array',
            'categories.*' => 'integer|exists:categories,id',
        ]);

        try {
            // Check if status can be updated
            if ($product->status === 'active' && $validated['status'] !== 'active') {
                return back()->withErrors(['status_error' => 'Cannot update status from active.']);
            }

            $categories = $validated['categories'] ?? [];
            unset($validated['categories']);

            // Store old quantity for calculation
            $oldQuantity = $product->quantity;
            $newQuantity = $validated['quantity'];
            $quantityDifference = $newQuantity - $oldQuantity;

            // Calculate new quantity_available
            $newQuantityAvailable = $product->quantity_available + $quantityDifference;

            // Ensure quantity_available doesn't go negative
            if ($newQuantityAvailable < 0) {
                return back()->withErrors(['quantity_error' => 'Cannot reduce quantity below ordered items.']);
            }

            // Store old status for comparison
            $oldStatus = $product->status;
            $newStatus = $validated['status'];

            // Update product with calculated quantities
            $product->update([
                'quantity' => $newQuantity,
                'quantity_available' => $newQuantityAvailable,
                'status' => $newStatus,
            ]);

            // Handle Printify publish/unpublish based on status change
            if ($product->printify_product_id && $oldStatus !== $newStatus) {
                $this->handlePrintifyPublishStatus($product, $oldStatus, $newStatus);
            }

            // Update categories
            $product->categories()->sync($categories);

            // Prepare success message with calculation details
            $successMessage = 'Product updated successfully';
            if ($quantityDifference != 0) {
                $action = $quantityDifference > 0 ? 'increased' : 'decreased';
                $successMessage .= ". Quantity {$action} by " . abs($quantityDifference);
            }

            return redirect()->route('products.index')
                ->with('success', $successMessage);

        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Failed to update product: ' . $e->getMessage()]);
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
                'error' => $e->getMessage()
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
                    'printify_product_id' => $product->printify_product_id
                ]);

                // Mark publishing as succeeded
                $this->printifyService->markPublishingSucceeded(
                    $product->printify_product_id,
                    $product->id,
                    route('products.show', $product) // Your product URL
                );
            } else {
                \Log::warning('Printify product auto-publish failed', [
                    'product_id' => $product->id,
                    'printify_product_id' => $product->printify_product_id,
                    'error' => $publishResult['error'] ?? 'Unknown error'
                ]);
            }
        } catch (\Exception $e) {
            \Log::error('Auto-publish Printify product failed', [
                'product_id' => $product->id,
                'printify_product_id' => $product->printify_product_id,
                'error' => $e->getMessage()
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
                    'printify_product_id' => $product->printify_product_id
                ]);
            } else {
                \Log::warning('Printify product auto-unpublish failed', [
                    'product_id' => $product->id,
                    'printify_product_id' => $product->printify_product_id,
                    'error' => $unpublishResult['error'] ?? 'Unknown error'
                ]);
            }
        } catch (\Exception $e) {
            \Log::error('Auto-unpublish Printify product failed', [
                'product_id' => $product->id,
                'printify_product_id' => $product->printify_product_id,
                'error' => $e->getMessage()
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
                ->with('success', 'Product deleted successfully' . ($product->printify_product_id ? ' from Printify' : ''));

        } catch (\Exception $e) {
            return back()->withErrors(['printify_error' => 'Failed to delete product: ' . $e->getMessage()]);
        }
    }
}
