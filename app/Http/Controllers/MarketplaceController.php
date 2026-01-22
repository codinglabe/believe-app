<?php
namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Organization;
use App\Models\Product;
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
        $categoryIds = array_filter(
            explode(',', $request->input('categories', '')),
            fn($id) => !empty($id)
        );

        $organizationIds = array_filter(
            explode(',', $request->input('organizations', '')),
            fn($id) => !empty($id)
        );

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

        $products = Product::query()
            ->with(['organization', 'categories', 'variants'])
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', '%' . $search . '%')
                        ->orWhere('description', 'like', '%' . $search . '%');
                });
            })
            ->when(!empty($categoryIds), function ($query) use ($categoryIds) {
                $query->whereHas('categories', function ($q) use ($categoryIds) {
                    $q->whereIn('categories.id', $categoryIds);
                });
            })
            ->when(!empty($organizationIds), function ($query) use ($organizationIds) {
                $query->whereIn('organization_id', $organizationIds);
            })
            // যদি লগইন থাকে, তাহলে শুধু allowed অর্গানাইজেশনের প্রোডাক্ট দেখাবে
            // লগইন না থাকলে সব active প্রোডাক্ট দেখাবে (এই when ব্লক এক্সিকিউট হবে না)
            ->when($user && !empty($allowedOrganizationIds), function ($query) use ($allowedOrganizationIds) {
                $query->whereIn('organization_id', $allowedOrganizationIds);
            })
            ->where('status', 'active')
            ->where('quantity_available', '>', 0)
            ->orderBy('created_at', 'desc')
            ->get();

        // Process products with cached Printify images
        $processedProducts = $this->processProductsWithImagesNDVariantsPrice($products);

        $categories = Category::where('status', 'active')->get();

        $organizations = Organization::query()
            ->when($user && !empty($allowedOrganizationIds), function ($query) use ($allowedOrganizationIds) {
                $query->whereIn('id', $allowedOrganizationIds);
            })
            ->get(['id', 'name']);

        return Inertia::render('frontend/marketplace', [
            'products' => $processedProducts,
            'categories' => $categories,
            'organizations' => $organizations,
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
