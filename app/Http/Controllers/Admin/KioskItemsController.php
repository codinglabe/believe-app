<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Country;
use App\Models\KioskCategory;
use App\Models\KioskService;
use App\Models\KioskSubcategory;
use App\Models\State;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class KioskItemsController extends Controller
{
    public function __construct()
    {
        $this->middleware(['auth', 'EnsureEmailIsVerified', 'role:admin']);
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    protected function usStatesForInertia(): array
    {
        $usId = Country::where('code', 'US')->value('id');
        if (! $usId) {
            return [];
        }

        return State::query()
            ->where('country_id', $usId)
            ->orderBy('name')
            ->get(['name', 'abbr'])
            ->map(fn (State $s) => [
                'value' => $s->abbr,
                'label' => $s->name.' ('.$s->abbr.')',
            ])
            ->all();
    }

    /**
     * @return array<int, \Illuminate\Contracts\Validation\ValidationRule|string>
     */
    protected function kioskStateValidationRules(): array
    {
        $usId = Country::where('code', 'US')->value('id');
        $rules = ['nullable', 'string'];
        if ($usId) {
            $rules[] = 'size:2';
            $rules[] = Rule::exists('states', 'abbr')->where(fn ($q) => $q->where('country_id', $usId));
        } else {
            $rules[] = 'max:64';
        }

        return $rules;
    }

    /** Normalize to 2-letter `states.abbr` when possible (handles legacy full names on edit). */
    protected function normalizeKioskStateInput(Request $request): void
    {
        $raw = $request->input('state');
        if (! filled($raw)) {
            $request->merge(['state' => null]);

            return;
        }
        $raw = trim((string) $raw);
        $usId = Country::where('code', 'US')->value('id');
        if (strlen($raw) === 2) {
            $request->merge(['state' => strtoupper($raw)]);

            return;
        }
        if ($usId) {
            $found = State::query()
                ->where('country_id', $usId)
                ->where(function ($q) use ($raw) {
                    $q->where('name', $raw)->orWhere('abbr', strtoupper($raw));
                })
                ->first();
            if ($found) {
                $request->merge(['state' => $found->abbr]);

                return;
            }
        }
        $request->merge(['state' => strtoupper($raw)]);
    }

    public function index(Request $request): Response
    {
        $query = KioskService::query()->with('category');

        if ($request->filled('category')) {
            $query->where('category_slug', $request->category);
        }
        if ($request->filled('search')) {
            $term = $request->search;
            $query->where(function ($q) use ($term) {
                $q->where('display_name', 'like', '%'.$term.'%')
                    ->orWhere('subcategory', 'like', '%'.$term.'%');
            });
        }

        $items = $query->orderBy('category_sort')
            ->orderBy('item_sort_within_category')
            ->orderBy('display_name')
            ->paginate(10)
            ->withQueryString()
            ->through(fn ($s) => [
                'id' => $s->id,
                'display_name' => $s->display_name,
                'subcategory' => $s->subcategory,
                'category_slug' => $s->category_slug,
                'category_title' => $s->category?->title ?? $s->category_slug,
                'url' => $s->url,
                'is_active' => (bool) $s->is_active,
            ]);

        $categories = KioskCategory::orderBy('sort_order')->get(['slug', 'title'])->map(fn ($c) => [
            'value' => $c->slug,
            'label' => $c->title,
        ])->all();

        return Inertia::render('admin/kiosk-items/index', [
            'items' => $items,
            'categories' => $categories,
            'filters' => [
                'search' => $request->query('search'),
                'category' => $request->query('category'),
            ],
        ]);
    }

    public function create(): Response
    {
        $categories = KioskCategory::orderBy('sort_order')->get(['slug', 'title'])->map(fn ($c) => [
            'value' => $c->slug,
            'label' => $c->title,
        ])->all();

        $subcategories = KioskSubcategory::orderBy('category_slug')->orderBy('sort_order')->orderBy('name')
            ->get(['category_slug', 'name'])
            ->map(fn ($s) => ['category_slug' => $s->category_slug, 'name' => $s->name])
            ->all();

        return Inertia::render('admin/kiosk-items/create', [
            'categories' => $categories,
            'subcategories' => $subcategories,
            'usStates' => $this->usStatesForInertia(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->normalizeKioskStateInput($request);

        $validated = $request->validate([
            'display_name' => 'required|string|max:255',
            'category_slug' => 'required|string|max:64|exists:kiosk_categories,slug',
            'subcategory' => 'nullable|string|max:128',
            'url' => 'nullable|string|max:500',
            'is_active' => 'boolean',
            'market_code' => 'nullable|string|max:64',
            'state' => $this->kioskStateValidationRules(),
            'city' => 'nullable|string|max:128',
        ]);

        $slug = \Str::slug($validated['display_name']);
        $baseSlug = $validated['category_slug'].'--'.$slug;
        $serviceSlug = $baseSlug;
        $n = 0;
        while (KioskService::where('service_slug', $serviceSlug)->exists()) {
            $n++;
            $serviceSlug = $baseSlug.'-'.$n;
        }

        $category = KioskCategory::where('slug', $validated['category_slug'])->first();
        $categorySort = $category ? (int) $category->sort_order : 0;
        $maxItem = (int) KioskService::where('category_slug', $validated['category_slug'])->max('item_sort_within_category');

        KioskService::create([
            'display_name' => $validated['display_name'],
            'category_slug' => $validated['category_slug'],
            'subcategory' => $validated['subcategory'] ?? null,
            'url' => ! empty($validated['url']) ? $validated['url'] : null,
            'is_active' => $validated['is_active'] ?? true,
            'market_code' => $validated['market_code'] ?? null,
            'state' => $validated['state'] ?? null,
            'city' => $validated['city'] ?? null,
            'service_slug' => $serviceSlug,
            'launch_type' => ! empty($validated['url']) ? 'web_portal' : null,
            'category_sort' => $categorySort,
            'item_sort_within_category' => $maxItem + 1,
        ]);

        return redirect()->route('admin.kiosk.items.index')->with('success', 'Kiosk item created.');
    }

    public function edit(KioskService $item): Response
    {
        $categories = KioskCategory::orderBy('sort_order')->get(['slug', 'title'])->map(fn ($c) => [
            'value' => $c->slug,
            'label' => $c->title,
        ])->all();

        $subcategories = KioskSubcategory::orderBy('category_slug')->orderBy('sort_order')->orderBy('name')
            ->get(['category_slug', 'name'])
            ->map(fn ($s) => ['category_slug' => $s->category_slug, 'name' => $s->name])
            ->all();

        return Inertia::render('admin/kiosk-items/edit', [
            'item' => [
                'id' => $item->id,
                'display_name' => $item->display_name,
                'category_slug' => $item->category_slug,
                'subcategory' => $item->subcategory,
                'url' => $item->url,
                'is_active' => (bool) $item->is_active,
                'market_code' => $item->market_code,
                'state' => $item->state,
                'city' => $item->city,
                'service_slug' => $item->service_slug,
            ],
            'categories' => $categories,
            'subcategories' => $subcategories,
            'usStates' => $this->usStatesForInertia(),
        ]);
    }

    public function update(Request $request, KioskService $item): RedirectResponse
    {
        $this->normalizeKioskStateInput($request);

        $validated = $request->validate([
            'display_name' => 'required|string|max:255',
            'category_slug' => 'required|string|max:64|exists:kiosk_categories,slug',
            'subcategory' => 'nullable|string|max:128',
            'url' => 'nullable|string|max:500',
            'is_active' => 'boolean',
            'market_code' => 'nullable|string|max:64',
            'state' => $this->kioskStateValidationRules(),
            'city' => 'nullable|string|max:128',
        ]);

        $item->update([
            'display_name' => $validated['display_name'],
            'category_slug' => $validated['category_slug'],
            'subcategory' => $validated['subcategory'] ?? null,
            'url' => ! empty($validated['url']) ? $validated['url'] : null,
            'is_active' => $validated['is_active'] ?? true,
            'market_code' => $validated['market_code'] ?? null,
            'state' => $validated['state'] ?? null,
            'city' => $validated['city'] ?? null,
            'launch_type' => ! empty($validated['url']) ? 'web_portal' : $item->launch_type,
        ]);

        return redirect()->route('admin.kiosk.items.index')->with('success', 'Kiosk item updated.');
    }

    public function destroy(KioskService $item): RedirectResponse
    {
        $item->delete();

        return redirect()->route('admin.kiosk.items.index')->with('success', 'Kiosk item deleted.');
    }
}
