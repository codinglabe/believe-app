<?php
namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Organization;
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

        $categories = Category::where('status', 'active')->get();
        $organizations = Organization::where('status', 'active')->get(['id', 'name']);

        return Inertia::render('frontend/marketplace', [
            'products' => $products,
            'categories' => $categories,
            'organizations' => $organizations,
            'selectedCategories' => $categoryIds,
            'selectedOrganizations' => $organizationIds,
            'search' => $search,
        ]);
    }
}
