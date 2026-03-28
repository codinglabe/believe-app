<?php
namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\MarketplaceProduct;
use App\Models\Merchant;
use App\Models\Organization;
use App\Models\OrganizationProduct;
use App\Models\Product;
use Illuminate\Support\Str;
use App\Services\PrintifyService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\Cache;

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

        $merchantIds = array_values(array_filter(
            array_map('intval', explode(',', (string) $request->input('merchants', ''))),
            fn (int $id) => $id > 0
        ));

        $sellerType = $request->input('seller_type', 'all');
        if (! in_array($sellerType, ['all', 'organization', 'merchant'], true)) {
            $sellerType = 'all';
        }

        $showCatalog = in_array($sellerType, ['all', 'organization'], true);
        $showPool = in_array($sellerType, ['all', 'merchant'], true);

        $search = $request->input('search');

        $user = Auth::user();
        $followedOrganizationIds = [];
        $userOrganizationId = null;

        if ($user) {
            $followedOrganizationIds = $user->favoriteOrganizations()->pluck('organizations.id')->toArray();
            $userOrganization = Organization::where('user_id', $user->id)->first();
            $userOrganizationId = $userOrganization ? $userOrganization->id : null;
        }

        // Combine followed organizations and user's own organization
        $allowedOrganizationIds = $followedOrganizationIds;
        if ($userOrganizationId) {
            $allowedOrganizationIds[] = $userOrganizationId;
        }

        $products = collect();

        if ($showCatalog) {
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
                ->when($user && ! empty($allowedOrganizationIds), function ($query) use ($allowedOrganizationIds) {
                    $query->whereIn('organization_id', $allowedOrganizationIds);
                })
                ->where('status', 'active')
                ->where('quantity_available', '>', 0)
                ->orderBy('created_at', 'desc')
                ->get();
        }

        $poolListingsQuery = OrganizationProduct::query()
            ->with(['organization', 'marketplaceProduct.merchant'])
            ->where('status', 'active')
            ->whereHas('marketplaceProduct', function ($q) {
                $q->where('status', 'active')
                    ->where('nonprofit_marketplace_enabled', true)
                    ->where(function ($qq) {
                        $qq->whereNull('inventory_quantity')
                            ->orWhere('inventory_quantity', '>', 0);
                    });
            })
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->whereHas('marketplaceProduct', function ($mq) use ($search) {
                        $mq->where('name', 'like', '%'.$search.'%')
                            ->orWhere('description', 'like', '%'.$search.'%');
                    })->orWhereHas('organization', function ($oq) use ($search) {
                        $oq->where('name', 'like', '%'.$search.'%');
                    });
                });
            })
            ->when(! empty($organizationIds), function ($query) use ($organizationIds) {
                $query->whereIn('organization_id', $organizationIds);
            })
            ->when(! empty($categoryIds), function ($query) use ($categoryIds) {
                $query->whereHas('marketplaceProduct', function ($mq) use ($categoryIds) {
                    $mq->whereIn('category_id', $categoryIds);
                });
            })
            ->when($user && ! empty($allowedOrganizationIds), function ($query) use ($allowedOrganizationIds) {
                $query->whereIn('organization_id', $allowedOrganizationIds);
            })
            ->when(! empty($merchantIds), function ($query) use ($merchantIds) {
                $query->whereHas('marketplaceProduct', function ($mq) use ($merchantIds) {
                    $mq->whereIn('merchant_id', $merchantIds);
                });
            });

        $poolListings = [];

        if ($showPool) {
            $poolListings = $poolListingsQuery
                ->orderByDesc('is_featured')
                ->orderByDesc('updated_at')
                ->get()
                ->map(function (OrganizationProduct $op) {
                    $mp = $op->marketplaceProduct;
                    $images = $mp->images ?? [];
                    $first = is_array($images) && count($images) > 0 ? $images[0] : null;
                    $imageUrl = $first
                        ? (filter_var($first, FILTER_VALIDATE_URL) ? $first : asset('storage/'.ltrim((string) $first, '/')))
                        : '';
                    $merchant = $mp->merchant;

                    return [
                        'id' => $op->id,
                        'name' => $mp->name,
                        'description' => Str::limit((string) ($mp->description ?? ''), 160),
                        'price' => (float) $op->custom_price,
                        'price_display' => '$'.number_format((float) $op->custom_price, 2),
                        'image_url' => $imageUrl,
                        'organization' => [
                            'id' => $op->organization->id,
                            'name' => $op->organization->name,
                        ],
                        'merchant' => [
                            'id' => $merchant?->id,
                            'name' => $merchant ? ($merchant->business_name ?: $merchant->name) : null,
                        ],
                        'listing_type' => 'merchant_pool',
                        'url' => route('marketplace.pool.show', $op),
                    ];
                })
                ->values()
                ->all();
        }

        $merchantIdsForFilter = MarketplaceProduct::query()
            ->where('status', 'active')
            ->where('nonprofit_marketplace_enabled', true)
            ->where(function ($qq) {
                $qq->whereNull('inventory_quantity')
                    ->orWhere('inventory_quantity', '>', 0);
            })
            ->whereHas('organizationProducts', function ($q) use ($user, $allowedOrganizationIds) {
                $q->where('status', 'active');
                if ($user && ! empty($allowedOrganizationIds)) {
                    $q->whereIn('organization_id', $allowedOrganizationIds);
                }
            })
            ->distinct()
            ->pluck('merchant_id')
            ->filter()
            ->values()
            ->all();

        $merchantsForFilter = Merchant::query()
            ->whereIn('id', $merchantIdsForFilter)
            ->orderBy('business_name')
            ->orderBy('name')
            ->get(['id', 'business_name', 'name'])
            ->map(fn (Merchant $m) => [
                'id' => $m->id,
                'name' => $m->business_name ?: $m->name,
            ])
            ->values()
            ->all();

        // Process products with cached Printify images
        $processedProducts = $this->processProductsWithImagesNDVariantsPrice($products);

        $categories = Category::where('status', 'active')->get();

        $organizations = Organization::query()
            ->when($user && !empty($allowedOrganizationIds), function ($query) use ($allowedOrganizationIds) {
                $query->whereIn('id', $allowedOrganizationIds);
            })
            ->get(['id', 'name']);

        return Inertia::render('frontend/marketplace', [
            'seo' => \App\Services\SeoService::forPage('marketplace'),
            'products' => $processedProducts,
            'poolListings' => $poolListings,
            'categories' => $categories,
            'organizations' => $organizations,
            'merchants' => $merchantsForFilter,
            'selectedCategories' => $categoryIds,
            'selectedOrganizations' => $organizationIds,
            'selectedMerchants' => $merchantIds,
            'sellerType' => $sellerType,
            'search' => $search,
        ]);
    }

    /**
     * Process products with cached Printify images - handles both Printify and manual products
     */
    private function processProductsWithImagesNDVariantsPrice($products)
    {
        return $products->map(function ($product) {
            $productData = $product->toArray();

            // Handle Printify products
            if ($product->printify_product_id) {
                $cacheKey = "printify_product_view{$product->printify_product_id}";

                try {
                    $printifyProduct = $this->printifyService->getProduct($product->printify_product_id);

                    // Calculate min and max price from product variants using Printify variant prices
                    if ($productData['variants'] && count($productData['variants']) > 0) {
                        $prices = [];

                        foreach ($productData['variants'] as $productVariant) {
                            $variantId = $productVariant['printify_variant_id'];

                            // Find this variant in Printify response
                            foreach ($printifyProduct['variants'] as $printifyVariant) {
                                if ($printifyVariant['id'] == $variantId && $printifyVariant['is_enabled']) {
                                    // Convert cents to dollars and add to prices array
                                    $priceInDollars = $printifyVariant['price'] / 100;
                                    $prices[] = $priceInDollars;
                                    break;
                                }
                            }
                        }

                        if (!empty($prices)) {
                            $minPrice = min($prices);
                            $maxPrice = max($prices);

                            $productData['min_price'] = $minPrice;
                            $productData['max_price'] = $maxPrice;

                            // Set display format
                            if ($minPrice == $maxPrice) {
                                $productData['price_display'] = '$' . number_format($minPrice, 2);
                            } else {
                                $productData['price_display'] = '$' . number_format($minPrice, 2) . ' - $' . number_format($maxPrice, 2);
                            }

                            // Set base price as minimum
                            $productData['price'] = $minPrice;
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
                    \Log::error('Error processing Printify product in marketplace: ' . $e->getMessage());
                    // Fallback to basic product data
                }
            } else {
                // Handle manual products
                $unitPrice = $product->unit_price ?? 0;
                $productData['price'] = $unitPrice;
                $productData['min_price'] = $unitPrice;
                $productData['max_price'] = $unitPrice;
                $productData['price_display'] = '$' . number_format($unitPrice, 2);

                // Use product image if available
                if ($product->image) {
                    $productData['image'] = $product->image;
                    $productData['image_url'] = $product->image;
                }
            }

            return $productData;
        });
    }
}
