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

class ProductController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): Response
    {

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
                    ->orWhere('description', 'LIKE', "%{$search}%");
            });
        }

        $products = $query->orderBy('id', 'desc')
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
    public function create(): Response
    {
        $categories = Category::all();
        // If you want to pass organizations, fetch them here
        $organizations = Organization::all(['id', 'name']);
        return Inertia::render('products/create', [
            'categories' => $categories,
            'organizations' => $organizations,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'required|string|max:1000',
            'quantity' => 'required|integer|min:0',
            'unit_price' => 'required|numeric|min:0',
            // 'admin_owned' => 'required|boolean',
            'owned_by' => 'required|in:admin,organization',
            'organization_id' => 'nullable|integer|exists:organizations,id',
            'status' => 'required|in:active,inactive,archived',
            'sku' => 'required|string|max:255|unique:products,sku',
            'type' => 'required|in:digital,physical',
            'tags' => 'nullable|string',
            'categories' => 'array',
            'categories.*' => 'integer|exists:categories,id',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg',
        ]);

        $imagePath = null;
        if ($request->hasFile('image')) {
            $image = $request->file('image');
            $imageName = time() . '_' . $image->getClientOriginalName();
            $imagePath = $image->storeAs('products', $imageName, 'public');
        }

        $categories = $validated['categories'] ?? [];
        unset($validated['categories']);
        $product = Product::create($validated);
        $product->categories()->sync($categories);


        $product->update([
            'image' => $imagePath,
        ]);

        if (Auth::user()->role == "organization") {
            $organization = Organization::where('user_id', Auth::id())->first();
            $product->update([
                'owned_by' => 'organization',
                'organization_id' => $organization->id,
            ]);
        }

        return redirect()->route('products.index')->with('success', 'Product created successfully');
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Product $product): Response
    {
        if ($product->user_id !== Auth::id()) {
            abort(403, 'Unauthorized action.');
        }
        $categories = Category::all();
        $organizations = Organization::all(['id', 'name']);


        // dd($organizations);
        $selectedCategories = $product->categories()->pluck('categories.id')->toArray();
        return Inertia::render('products/edit', [
            'product' => $product,
            'categories' => $categories,
            'selectedCategories' => $selectedCategories,
            // 'organizations' => $organizations,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Product $product)
    {

        if ($product->user_id !== Auth::id()) {
            abort(403, 'Unauthorized action.');
        }
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'required|string|max:1000',
            'quantity' => 'required|integer|min:0',
            'unit_price' => 'required|numeric|min:0',
            // 'admin_owned' => 'required|boolean',
            'owned_by' => 'required|in:admin,organization',
            'organization_id' => 'nullable|integer|exists:organizations,id',
            'status' => 'required|in:active,inactive,archived',
            'sku' => 'required|string|max:255|unique:products,sku,' . $product->id,
            'type' => 'required|in:digital,physical',
            'tags' => 'nullable|string',
            'categories' => 'array',
            'categories.*' => 'integer|exists:categories,id',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
        ]);
        $categories = $validated['categories'] ?? [];
        unset($validated['categories']);
        $product->update($validated);



        if ($request->hasFile('image')) {
            // Delete old image if exists
            if ($product->image && Storage::disk('public')->exists($product->image)) {
                Storage::disk('public')->delete($product->image);
            }

            // Store new image
            $image = $request->file('image');
            $imageName = time() . '_' . $image->getClientOriginalName();
            $imagePath = $image->storeAs('products', $imageName, 'public');

            $product->update([
                'image' => $imagePath,
            ]);
        }

        if (Auth::user()->role == "organization") {
            $organization = Organization::where('user_id', Auth::id())->first();
            $product->update([
                'owned_by' => 'organization',
                'organization_id' => $organization->id,
            ]);
        }


        $product->categories()->sync($categories);
        return redirect()->route('products.index')->with('success', 'Product updated successfully');
        // Ensure user can only update their own products
        if ($product->user_id !== Auth::id()) {
            abort(403, 'Unauthorized action.');
        }


        // dd($request->all());
        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'required|string|max:1000',
            'price' => 'required|numeric|min:0',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
            'status' => 'required|string|in:active,inactive',
        ]);



        if ($request->hasFile('image')) {
            // Delete old image if exists
            if ($product->image && Storage::disk('public')->exists($product->image)) {
                Storage::disk('public')->delete($product->image);
            }

            // Store new image
            $image = $request->file('image');
            $imageName = time() . '_' . $image->getClientOriginalName();
            $imagePath = $image->storeAs('products', $imageName, 'public');

            $product->update([
                'image' => $imagePath,
            ]);
        }


        $product->update([
            'name' => $request->name,
            'description' => $request->description,
            'price' => $request->price,
            'status' => $request->status,
        ]);

        return redirect()->route('products.index')
            ->with('success', 'Product updated successfully');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Product $product)
    {
        if ($product->user_id !== Auth::id()) {
            abort(403, 'Unauthorized action.');
        }
        $product->categories()->detach();
        $product->delete();
        return redirect()->route('products.index')->with('success', 'Product deleted successfully');
        // Ensure user can only delete their own products
        if ($product->user_id !== Auth::id()) {
            abort(403, 'Unauthorized action.');
        }

        // Delete image file if exists
        if ($product->image && Storage::disk('public')->exists($product->image)) {
            Storage::disk('public')->delete($product->image);
        }

        $product->delete();

        return redirect()->route('products.index')
            ->with('success', 'Product deleted successfully');
    }
}
