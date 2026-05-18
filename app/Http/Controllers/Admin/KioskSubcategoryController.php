<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\KioskCategory;
use App\Models\KioskSubcategory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class KioskSubcategoryController extends Controller
{
    public function __construct()
    {
        $this->middleware(['auth', 'EnsureEmailIsVerified', 'role:admin']);
    }

    public function index(Request $request): Response
    {
        $countsBySlug = KioskSubcategory::query()
            ->selectRaw('category_slug, count(*) as c')
            ->groupBy('category_slug')
            ->pluck('c', 'category_slug');

        $categoriesForPicker = KioskCategory::orderBy('sort_order')->get(['slug', 'title'])->map(fn ($c) => [
            'slug' => $c->slug,
            'title' => $c->title,
            'subcategory_count' => (int) ($countsBySlug[$c->slug] ?? 0),
        ])->all();

        if (! $request->filled('category')) {
            return Inertia::render('admin/kiosk-subcategories/index', [
                'pickCategory' => true,
                'categoriesForPicker' => $categoriesForPicker,
                'subcategories' => null,
                'selectedCategory' => null,
                'categories' => [],
                'filters' => ['search' => null, 'category' => null],
            ]);
        }

        $categorySlug = $request->query('category');
        $categoryModel = KioskCategory::where('slug', $categorySlug)->first();
        if (! $categoryModel) {
            return redirect()->route('admin.kiosk.subcategories.index')
                ->with('error', 'Invalid category.');
        }

        $query = KioskSubcategory::query()->with('category')
            ->where('category_slug', $categorySlug);

        if ($request->filled('search')) {
            $term = $request->search;
            $query->where('name', 'like', '%'.$term.'%');
        }

        $subcategories = $query->orderBy('sort_order')
            ->orderBy('name')
            ->paginate(20)
            ->withQueryString()
            ->through(fn ($s) => [
                'id' => $s->id,
                'name' => $s->name,
                'category_slug' => $s->category_slug,
                'category_title' => $s->category?->title ?? $s->category_slug,
                'sort_order' => $s->sort_order,
            ]);

        return Inertia::render('admin/kiosk-subcategories/index', [
            'pickCategory' => false,
            'categoriesForPicker' => $categoriesForPicker,
            'subcategories' => $subcategories,
            'selectedCategory' => [
                'slug' => $categoryModel->slug,
                'title' => $categoryModel->title,
            ],
            'categories' => [],
            'filters' => [
                'search' => $request->query('search'),
                'category' => $categorySlug,
            ],
        ]);
    }

    public function create(Request $request): Response|RedirectResponse
    {
        $categorySlug = $request->query('category');
        if (! $categorySlug || ! KioskCategory::where('slug', $categorySlug)->exists()) {
            return redirect()
                ->route('admin.kiosk.subcategories.index')
                ->with('error', 'Choose a category first, then add a subcategory for that category.');
        }

        $category = KioskCategory::where('slug', $categorySlug)->first();

        return Inertia::render('admin/kiosk-subcategories/create', [
            'category_slug' => $category->slug,
            'category_title' => $category->title,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'category_slug' => 'required|string|max:64|exists:kiosk_categories,slug',
            'name' => 'required|string|max:128',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        KioskSubcategory::create([
            'category_slug' => $validated['category_slug'],
            'name' => $validated['name'],
            'sort_order' => $validated['sort_order'] ?? 0,
        ]);

        return redirect()->route('admin.kiosk.subcategories.index', ['category' => $validated['category_slug']])
            ->with('success', 'Subcategory created.');
    }

    public function edit(KioskSubcategory $subcategory): Response
    {
        $categories = KioskCategory::orderBy('sort_order')->get(['slug', 'title'])->map(fn ($c) => [
            'value' => $c->slug,
            'label' => $c->title,
        ])->all();

        return Inertia::render('admin/kiosk-subcategories/edit', [
            'subcategory' => [
                'id' => $subcategory->id,
                'category_slug' => $subcategory->category_slug,
                'name' => $subcategory->name,
                'sort_order' => $subcategory->sort_order,
            ],
            'categories' => $categories,
        ]);
    }

    public function update(Request $request, KioskSubcategory $subcategory): RedirectResponse
    {
        $validated = $request->validate([
            'category_slug' => 'required|string|max:64|exists:kiosk_categories,slug',
            'name' => 'required|string|max:128',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        $subcategory->update([
            'category_slug' => $validated['category_slug'],
            'name' => $validated['name'],
            'sort_order' => $validated['sort_order'] ?? 0,
        ]);

        return redirect()->route('admin.kiosk.subcategories.index', ['category' => $validated['category_slug']])
            ->with('success', 'Subcategory updated.');
    }

    public function destroy(KioskSubcategory $subcategory): RedirectResponse
    {
        $slug = $subcategory->category_slug;
        $subcategory->delete();

        return redirect()->route('admin.kiosk.subcategories.index', ['category' => $slug])
            ->with('success', 'Subcategory deleted.');
    }
}
