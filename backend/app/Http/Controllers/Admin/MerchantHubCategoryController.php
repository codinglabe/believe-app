<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\BaseController;
use App\Models\MerchantHubCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;

class MerchantHubCategoryController extends BaseController
{
    /**
     * Display a listing of merchant hub categories.
     */
    public function index(Request $request)
    {
        $this->authorizeRole($request, 'admin');

        $categories = MerchantHubCategory::orderBy('name')->get();

        return Inertia::render('admin/MerchantHubCategories/Index', [
            'categories' => $categories,
        ]);
    }

    /**
     * Show the form for creating a new merchant hub category.
     */
    public function create(Request $request)
    {
        $this->authorizeRole($request, 'admin');

        return Inertia::render('admin/MerchantHubCategories/Create');
    }

    /**
     * Store a newly created merchant hub category.
     */
    public function store(Request $request)
    {
        $this->authorizeRole($request, 'admin');

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:merchant_hub_categories,slug',
            'is_active' => 'boolean',
        ]);

        // Generate slug if not provided
        if (empty($validated['slug'])) {
            $validated['slug'] = Str::slug($validated['name']);
            // Ensure uniqueness
            $counter = 1;
            $originalSlug = $validated['slug'];
            while (MerchantHubCategory::where('slug', $validated['slug'])->exists()) {
                $validated['slug'] = $originalSlug . '-' . $counter;
                $counter++;
            }
        }

        try {
            MerchantHubCategory::create($validated);

            return redirect()->route('admin.merchant-hub-categories.index')
                ->with('success', 'Category created successfully.');
        } catch (\Exception $e) {
            Log::error('Merchant hub category creation error: ' . $e->getMessage());
            return redirect()->back()
                ->withInput()
                ->with('error', 'Failed to create category: ' . $e->getMessage());
        }
    }

    /**
     * Show the form for editing the specified merchant hub category.
     */
    public function edit(Request $request, MerchantHubCategory $merchantHubCategory)
    {
        $this->authorizeRole($request, 'admin');

        return Inertia::render('admin/MerchantHubCategories/Edit', [
            'category' => $merchantHubCategory,
        ]);
    }

    /**
     * Update the specified merchant hub category.
     */
    public function update(Request $request, MerchantHubCategory $merchantHubCategory)
    {
        $this->authorizeRole($request, 'admin');

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:merchant_hub_categories,slug,' . $merchantHubCategory->id,
            'is_active' => 'boolean',
        ]);

        // Generate slug if not provided
        if (empty($validated['slug'])) {
            $validated['slug'] = Str::slug($validated['name']);
            // Ensure uniqueness
            $counter = 1;
            $originalSlug = $validated['slug'];
            while (MerchantHubCategory::where('slug', $validated['slug'])->where('id', '!=', $merchantHubCategory->id)->exists()) {
                $validated['slug'] = $originalSlug . '-' . $counter;
                $counter++;
            }
        }

        try {
            $merchantHubCategory->update($validated);

            return redirect()->route('admin.merchant-hub-categories.index')
                ->with('success', 'Category updated successfully.');
        } catch (\Exception $e) {
            Log::error('Merchant hub category update error: ' . $e->getMessage());
            return redirect()->back()
                ->withInput()
                ->with('error', 'Failed to update category: ' . $e->getMessage());
        }
    }

    /**
     * Remove the specified merchant hub category.
     */
    public function destroy(Request $request, MerchantHubCategory $merchantHubCategory)
    {
        $this->authorizeRole($request, 'admin');

        try {
            // Check if category has offers
            if ($merchantHubCategory->offers()->count() > 0) {
                return redirect()->back()
                    ->with('error', 'Cannot delete category with existing offers. Please remove or reassign offers first.');
            }

            $merchantHubCategory->delete();

            return redirect()->route('admin.merchant-hub-categories.index')
                ->with('success', 'Category deleted successfully.');
        } catch (\Exception $e) {
            Log::error('Merchant hub category deletion error: ' . $e->getMessage());
            return redirect()->back()
                ->with('error', 'Failed to delete category: ' . $e->getMessage());
        }
    }
}
