<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Order;
use App\Models\Organization;
use App\Models\OrganizationProduct;
use App\Models\Product;
use App\Services\BiuPlatformFeeService;
use App\Services\PrintifyService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class MarketplaceController extends Controller
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
        $categoryIds = array_values(array_filter(
            array_map('intval', explode(',', (string) $request->input('categories', ''))),
            fn (int $id) => $id > 0
        ));

        $organizationIds = array_values(array_filter(
            array_map('intval', explode(',', (string) $request->input('organizations', ''))),
            fn (int $id) => $id > 0
        ));

        $search = $request->input('search');

        $products = Product::query()
            ->with(['organization', 'categories', 'variants'])
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', '%'.$search.'%')
                        ->orWhere('description', 'like', '%'.$search.'%');
                });
            })
            ->when(! empty($categoryIds), function ($query) use ($categoryIds) {
                $query->whereHas('categories', function ($q) use ($categoryIds) {
                    $q->whereIn('categories.id', $categoryIds);
                });
            })
            ->when(! empty($organizationIds), function ($query) use ($organizationIds) {
                $query->whereIn('organization_id', $organizationIds);
            })
            ->where('status', 'active')
            ->where('quantity_available', '>', 0)
            ->orderBy('created_at', 'desc')
            ->get();

        // Catalog products (products table) + merchant-pool adoptions (organization_products)
        $catalogRows = $this->processProductsWithImagesNDVariantsPrice($products)
            ->map(function (array $row) {
                $row['listing_kind'] = 'catalog';
                $row['is_merchant_pool_listing'] = false;
                $row['organization_product_id'] = null;
                $row['_sort_ts'] = isset($row['created_at']) ? strtotime((string) $row['created_at']) : 0;

                return $row;
            });

        $poolRows = OrganizationProduct::query()
            ->with(['organization:id,name', 'marketplaceProduct.productCategory'])
            ->where('status', 'active')
            ->whereHas('marketplaceProduct', function ($q) {
                $q->where('status', 'active')
                    ->where('nonprofit_marketplace_enabled', true)
                    ->where(function ($q2) {
                        $q2->whereNull('inventory_quantity')
                            ->orWhere('inventory_quantity', '>', 0);
                    });
            })
            ->when($search, function ($q) use ($search) {
                $like = '%'.$search.'%';
                $q->whereHas('marketplaceProduct', function ($q2) use ($like) {
                    $q2->where('name', 'like', $like)
                        ->orWhere('description', 'like', $like);
                });
            })
            ->when(! empty($categoryIds), function ($q) use ($categoryIds) {
                $q->whereHas('marketplaceProduct', fn ($q2) => $q2->whereIn('category_id', $categoryIds));
            })
            ->when(! empty($organizationIds), function ($q) use ($organizationIds) {
                $q->whereIn('organization_id', $organizationIds);
            })
            ->orderByDesc('created_at')
            ->get();

        $poolCards = $poolRows->map(function (OrganizationProduct $op) {
            $mp = $op->marketplaceProduct;
            if ($mp === null) {
                return null;
            }

            $price = (float) $op->custom_price;
            $images = $mp->images ?? [];
            $first = is_array($images) && isset($images[0]) ? $images[0] : null;
            $imageUrl = $first
                ? (filter_var($first, FILTER_VALIDATE_URL) ? $first : asset('storage/'.ltrim((string) $first, '/')))
                : null;
            $qty = $mp->inventory_quantity !== null ? (int) $mp->inventory_quantity : 99999;

            return [
                'listing_kind' => 'pool',
                'is_merchant_pool_listing' => true,
                'organization_product_id' => $op->id,
                'id' => $op->id,
                'name' => $mp->name,
                'description' => Str::limit(trim(strip_tags((string) ($mp->description ?? ''))), 320),
                'price' => $price,
                'min_price' => $price,
                'max_price' => $price,
                'price_display' => '$'.number_format($price, 2),
                'unit_price' => $price,
                'image' => $imageUrl,
                'image_url' => $imageUrl ?? '/placeholder.svg',
                'quantity_available' => $qty,
                'rating' => 0,
                'reviews' => 0,
                'category' => $mp->productCategory ? ['id' => $mp->productCategory->id, 'name' => $mp->productCategory->name] : null,
                'organization' => $op->organization ? ['id' => $op->organization->id, 'name' => $op->organization->name] : null,
                'created_at' => $op->created_at?->toIso8601String(),
                '_sort_ts' => $op->created_at?->getTimestamp() ?? 0,
            ];
        })->filter()->values();

        $processedProducts = $catalogRows->concat($poolCards)
            ->sortByDesc('_sort_ts')
            ->values()
            ->map(function (array $row) {
                unset($row['_sort_ts']);

                return $row;
            })
            ->values()
            ->all();

        $categories = Category::query()->where('status', 'active')->parents()->orderBy('name')->get();

        $organizations = Organization::query()
            ->excludingCareAllianceHubs()
            ->get(['id', 'name']);

        $purchaseOrganizationIds = [];
        $authUser = Auth::user();
        if ($authUser && $authUser->role === 'user') {
            $purchaseOrganizationIds = Order::query()
                ->where('user_id', $authUser->id)
                ->where('payment_status', 'paid')
                ->whereNotNull('organization_id')
                ->selectRaw('organization_id, MAX(created_at) as last_purchase')
                ->groupBy('organization_id')
                ->orderByDesc('last_purchase')
                ->pluck('organization_id')
                ->map(fn ($id) => (int) $id)
                ->values()
                ->all();
        }

        return Inertia::render('frontend/marketplace', [
            'seo' => \App\Services\SeoService::forPage('marketplace'),
            'products' => $processedProducts,
            'categories' => $categories,
            'organizations' => $organizations,
            'purchaseOrganizationIds' => $purchaseOrganizationIds,
            'selectedCategories' => $categoryIds,
            'selectedOrganizations' => $organizationIds,
            'search' => $search,
        ]);
    }

    /**
     * Process products with cached Printify images - handles both Printify and manual products
     */
    private function processProductsWithImagesNDVariantsPrice($products)
    {
        $platformFeePercentage = BiuPlatformFeeService::getSalesPlatformFeePercentage();

        return $products->map(function ($product) use ($platformFeePercentage) {
            $productData = $product->toArray();
            $isAtCostPricing = ! empty($product->organization_id) && $product->pricing_model === 'fixed';

            // Handle Printify products
            if ($product->printify_product_id) {
                $cacheKey = "printify_product_view{$product->printify_product_id}";

                try {
                    $printifyProduct = $this->printifyService->getProduct($product->printify_product_id);

                    // Calculate min and max price from product variants using Printify variant prices
                    if ($productData['variants'] && count($productData['variants']) > 0) {
                        $prices = [];
                        $costs = [];

                        foreach ($productData['variants'] as $productVariant) {
                            $variantId = $productVariant['printify_variant_id'];

                            // Find this variant in Printify response
                            foreach ($printifyProduct['variants'] as $printifyVariant) {
                                if ($printifyVariant['id'] == $variantId && $printifyVariant['is_enabled']) {
                                    // Convert cents to dollars and add to prices array
                                    $priceInDollars = $printifyVariant['price'] / 100;
                                    $prices[] = $priceInDollars;
                                    if (isset($printifyVariant['cost'])) {
                                        $costs[] = $printifyVariant['cost'] / 100;
                                    }
                                    break;
                                }
                            }
                        }

                        if (! empty($prices)) {
                            $minPrice = min($prices);
                            $maxPrice = max($prices);

                            $productData['min_price'] = $minPrice;
                            $productData['max_price'] = $maxPrice;

                            // Set display format
                            if ($minPrice == $maxPrice) {
                                $productData['price_display'] = '$'.number_format($minPrice, 2);
                            } else {
                                $productData['price_display'] = '$'.number_format($minPrice, 2).' - $'.number_format($maxPrice, 2);
                            }

                            // Set base price as minimum
                            $productData['price'] = $minPrice;
                        }

                        if (! empty($costs)) {
                            $minCost = min($costs);
                            $maxCost = max($costs);
                            $productData['at_cost_price'] = $minCost;
                            $productData['at_cost_display'] = $minCost === $maxCost
                                ? '$'.number_format($minCost, 2)
                                : 'From $'.number_format($minCost, 2);
                        }
                    }

                    $firstEnabledVariantPrice = null;
                    if (isset($productData['variants'][0])) {
                        foreach ($printifyProduct['variants'] as $variant) {
                            if ($variant['id'] == $productData['variants'][0]['printify_variant_id'] && $variant['is_enabled']) {
                                $firstEnabledVariantPrice = $variant['price'] / 100;
                                break;
                            }
                        }
                    }

                    if (count($printifyProduct['images']) > 0) {
                        // Get the first image
                        $firstImage = $printifyProduct['images'][0];
                        $productData['image'] = $firstImage['src'];
                        $productData['image_url'] = $firstImage['src'];
                        $productData['printify_images'] = $printifyProduct['images'];
                    }
                } catch (\Exception $e) {
                    Log::error('Error processing Printify product in marketplace: '.$e->getMessage());
                    // Fallback to basic product data
                }
            } else {
                // Handle manual products
                $unitPrice = $product->unit_price ?? 0;
                $atCost = $product->source_cost !== null ? (float) $product->source_cost : (float) $unitPrice;
                $productData['price'] = $unitPrice;
                $productData['min_price'] = $unitPrice;
                $productData['max_price'] = $unitPrice;
                $productData['price_display'] = '$'.number_format($unitPrice, 2);
                $productData['at_cost_price'] = $atCost;
                $productData['at_cost_display'] = '$'.number_format($atCost, 2);

                // Use product image if available
                if ($product->image) {
                    $productData['image'] = $product->image;
                    $productData['image_url'] = $product->image;
                }
            }

            $retailAmount = (float) ($productData['price'] ?? $product->unit_price ?? 0);
            $atCostAmount = (float) ($productData['at_cost_price'] ?? $retailAmount);
            $effectiveAmount = $isAtCostPricing ? $atCostAmount : $retailAmount;

            $productData['is_at_cost_pricing'] = $isAtCostPricing;
            $productData['typical_retail_price'] = $retailAmount;
            $productData['typical_retail_display'] = (string) ($productData['price_display'] ?? '$'.number_format($retailAmount, 2));
            $productData['platform_fee_percentage'] = $platformFeePercentage;
            $productData['platform_fee_amount'] = round($effectiveAmount * ($platformFeePercentage / 100), 2);
            $productData['platform_fee_display'] = '$'.number_format($productData['platform_fee_amount'], 2);

            if ($isAtCostPricing) {
                $productData['price'] = $atCostAmount;
                $productData['price_display'] = (string) ($productData['at_cost_display'] ?? '$'.number_format($atCostAmount, 2));
            }

            return $productData;
        });
    }
}
