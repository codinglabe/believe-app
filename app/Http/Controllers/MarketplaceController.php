<?php
namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Organization;
use App\Models\Product;
use App\Services\PrintifyService;
use Illuminate\Http\Request;
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

        $products = Product::query()
            ->with(['organization', 'categories'])
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', '%' . $search . '%')
                        ->orWhere('description', 'like', '%' . $search . '%');
                });
            })
            ->when(!empty($categoryIds), function ($query) use ($categoryIds) {
                $query->whereIn('category_id', $categoryIds);
            })
            ->when(!empty($organizationIds), function ($query) use ($organizationIds) {
                $query->whereIn('organization_id', $organizationIds);
            })
            ->where('status', 'active')
            ->where('quantity_available', '>', 0)
            ->orderBy('created_at', 'desc')
            ->get();

        // Process products with cached Printify images
        $processedProducts = $this->processProductsWithCachedImages($products);

        $categories = Category::where('status', 'active')->get();
        $organizations = Organization::where('status', 'active')->get(['id', 'name']);

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
     * Process products with cached Printify images
     */
    private function processProductsWithCachedImages($products)
    {
        return $products->map(function ($product) {
            $productData = $product->toArray();

            // If product has Printify ID, try to get cached images
            if ($product->printify_product_id) {
                $cacheKey = "printify_product_{$product->printify_product_id}_images";

                $printifyImages = Cache::remember($cacheKey, 3600, function () use ($product) {
                    try {
                        $printifyProduct = $this->printifyService->getProduct($product->printify_product_id);
                        return $printifyProduct['images'] ?? [];
                    } catch (\Exception $e) {
                        \Log::error('Error fetching Printify images: ' . $e->getMessage());
                        return [];
                    }
                });

                if (count($printifyImages) > 0) {
                    // Get the first image
                    $firstImage = $printifyImages[0];
                    $productData['image'] = $firstImage['src'];
                    $productData['image_url'] = $firstImage['src'];
                    $productData['printify_images'] = $printifyImages;
                }
            }

            return $productData;
        });
    }
}
