<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\BaseController;
use App\Models\ServiceCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class ServiceCategoryController extends BaseController
{
    /**
     * Display a listing of service categories.
     */
    public function index(Request $request)
    {
        $this->authorizeRole($request, 'admin');

        $categories = ServiceCategory::ordered()->get();

        return Inertia::render('admin/ServiceCategories/Index', [
            'categories' => $categories,
        ]);
    }

    /**
     * Show the form for creating a new service category.
     */
    public function create(Request $request)
    {
        $this->authorizeRole($request, 'admin');

        return Inertia::render('admin/ServiceCategories/Create');
    }

    /**
     * Store a newly created service category.
     */
    public function store(Request $request)
    {
        $this->authorizeRole($request, 'admin');

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:service_categories,slug',
            'description' => 'nullable|string',
            'icon' => 'nullable|string|max:255',
            'is_active' => 'boolean',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        try {
            ServiceCategory::create($validated);

            return redirect()->route('admin.service-categories.index')
                ->with('success', 'Service category created successfully.');
        } catch (\Exception $e) {
            Log::error('Service category creation error: ' . $e->getMessage());
            return redirect()->back()
                ->withInput()
                ->with('error', 'Failed to create service category: ' . $e->getMessage());
        }
    }

    /**
     * Show the form for editing the specified service category.
     */
    public function edit(Request $request, ServiceCategory $serviceCategory)
    {
        $this->authorizeRole($request, 'admin');

        return Inertia::render('admin/ServiceCategories/Edit', [
            'category' => $serviceCategory,
        ]);
    }

    /**
     * Update the specified service category.
     */
    public function update(Request $request, ServiceCategory $serviceCategory)
    {
        $this->authorizeRole($request, 'admin');

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:service_categories,slug,' . $serviceCategory->id,
            'description' => 'nullable|string',
            'icon' => 'nullable|string|max:255',
            'is_active' => 'boolean',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        try {
            $serviceCategory->update($validated);

            return redirect()->route('admin.service-categories.index')
                ->with('success', 'Service category updated successfully.');
        } catch (\Exception $e) {
            Log::error('Service category update error: ' . $e->getMessage());
            return redirect()->back()
                ->withInput()
                ->with('error', 'Failed to update service category: ' . $e->getMessage());
        }
    }

    /**
     * Remove the specified service category.
     */
    public function destroy(Request $request, ServiceCategory $serviceCategory)
    {
        $this->authorizeRole($request, 'admin');

        try {
            $serviceCategory->delete();

            return redirect()->route('admin.service-categories.index')
                ->with('success', 'Service category deleted successfully.');
        } catch (\Exception $e) {
            Log::error('Service category deletion error: ' . $e->getMessage());
            return redirect()->back()
                ->with('error', 'Failed to delete service category: ' . $e->getMessage());
        }
    }
}

