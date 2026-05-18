<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PrimaryActionCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class PrimaryActionCategoryController extends Controller
{
    public function index(): Response
    {
        $categories = PrimaryActionCategory::query()
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'name', 'slug', 'sort_order', 'is_active', 'created_at']);

        return Inertia::render('admin/primary-action-categories/index', [
            'categories' => $categories,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'sort_order' => 'nullable|integer|min:0|max:99999',
            'is_active' => 'boolean',
        ]);

        $base = Str::slug($validated['name']);
        $slug = $base;
        $n = 1;
        while (PrimaryActionCategory::where('slug', $slug)->exists()) {
            $slug = $base . '-' . $n++;
        }

        PrimaryActionCategory::create([
            'name' => $validated['name'],
            'slug' => $slug,
            'sort_order' => $validated['sort_order'] ?? 0,
            'is_active' => $request->boolean('is_active', true),
        ]);

        return redirect()->route('admin.primary-action-categories.index')
            ->with('success', 'Category added.');
    }

    public function update(Request $request, PrimaryActionCategory $primaryActionCategory)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'sort_order' => 'nullable|integer|min:0|max:99999',
            'is_active' => 'boolean',
        ]);

        $base = Str::slug($validated['name']);
        $slug = $base;
        if ($slug !== $primaryActionCategory->slug) {
            $n = 1;
            while (PrimaryActionCategory::where('slug', $slug)->where('id', '!=', $primaryActionCategory->id)->exists()) {
                $slug = $base . '-' . $n++;
            }
        } else {
            $slug = $primaryActionCategory->slug;
        }

        $primaryActionCategory->update([
            'name' => $validated['name'],
            'slug' => $slug,
            'sort_order' => $validated['sort_order'] ?? 0,
            'is_active' => $request->boolean('is_active', true),
        ]);

        return redirect()->route('admin.primary-action-categories.index')
            ->with('success', 'Category updated.');
    }

    public function destroy(PrimaryActionCategory $primaryActionCategory)
    {
        if ($primaryActionCategory->organizations()->exists()) {
            return redirect()->route('admin.primary-action-categories.index')
                ->with('error', 'Cannot delete: one or more organizations use this category.');
        }

        $primaryActionCategory->delete();

        return redirect()->route('admin.primary-action-categories.index')
            ->with('success', 'Category deleted.');
    }
}
