<?php
namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MarketplaceController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): Response
    {

        $categoryIds = array_filter(
            explode(',', $request->input('categories', '')),
            fn($id) => ! empty($id)
        );

        $search = $request->input('search');

        $products = Product::query()
            ->when($search, function ($query, $search) {
                $query->where('name', 'like', '%' . $search . '%');
            })
            ->when(! empty($categoryIds), function ($query) use ($categoryIds) {
                $query->whereHas('productCategory', function ($q) use ($categoryIds) {
                    $q->whereIn('product_associated_categories.category_id', $categoryIds);
                });
            })
            ->get();

        $categories = Category::where('status', 'active')->get();

        return Inertia::render('frontend/marketplace', [
            'products'           => $products,
            'categories'         => $categories,
            'selectedCategories' => $categoryIds,
            'search'             => $search,
        ]);

    }

}
