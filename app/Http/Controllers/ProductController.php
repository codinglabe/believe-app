<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Auth;

class ProductController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): Response
    {
        $perPage = $request->get('per_page', 10);
        $page = $request->get('page', 1);   
        $search = $request->get('search', '');
        
        $query = Product::query();
        
        // Only show products for current user
        $query->where('user_id', Auth::id());
        
        if ($search) {
            $query->where(function($q) use ($search) {
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
        return Inertia::render('products/create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'required|string|max:1000',
            'price' => 'required|numeric|min:0',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
            'status' => 'required|string|in:active,inactive',
        ]);

        $imagePath = null;
        if ($request->hasFile('image')) {
            $image = $request->file('image');
            $imageName = time() . '_' . $image->getClientOriginalName();
            $imagePath = $image->storeAs('products', $imageName, 'public');
        }

        

        Product::create([
            'user_id' => Auth::id(),
            'name' => $request->name,
            'description' => $request->description,
            'price' => $request->price,
            'image' => $imagePath,
            'status' => $request->status,
        ]);

        return redirect()->route('products.index')
            ->with('success', 'Product created successfully');
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Product $product): Response
    {
        // Ensure user can only edit their own products
        if ($product->user_id !== Auth::id()) {
            abort(403, 'Unauthorized action.');
        }
        

        return Inertia::render('products/edit', [
            'product' => $product
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Product $product)
    {
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

