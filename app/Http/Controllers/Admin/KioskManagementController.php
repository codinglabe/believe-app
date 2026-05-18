<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminSetting;
use App\Models\KioskCategory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class KioskManagementController extends Controller
{
    public function __construct()
    {
        $this->middleware(['auth', 'EnsureEmailIsVerified', 'role:admin']);
    }

    public function index(Request $request): Response
    {
        $query = KioskCategory::query();

        if ($request->filled('search')) {
            $term = trim((string) $request->query('search'));
            $query->where(function ($q) use ($term) {
                $q->where('title', 'like', '%'.$term.'%')
                    ->orWhere('slug', 'like', '%'.$term.'%')
                    ->orWhere('keywords', 'like', '%'.$term.'%')
                    ->orWhere('redirect_url', 'like', '%'.$term.'%');
            });
        }

        $categories = $query->orderBy('sort_order')->get()->map(fn ($c) => [
            'id' => $c->id,
            'slug' => $c->slug,
            'title' => $c->title,
            'keywords' => $c->keywords ?? '',
            'redirect_url' => $c->redirect_url ?? '',
            'sort_order' => $c->sort_order,
            'is_active' => (bool) $c->is_active,
        ]);

        $hero = AdminSetting::get('kiosk_hero', null);
        if (! is_array($hero)) {
            $hero = [
                'title' => 'How can we help today?',
                'subtitle' => 'Find assistance with bills, healthcare, government services, jobs, housing, and more',
            ];
        }

        return Inertia::render('admin/kiosk-management', [
            'categories' => $categories,
            'hero' => $hero,
            'filters' => [
                'search' => $request->query('search'),
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/kiosk-categories/create');
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'slug' => 'required|string|max:64|unique:kiosk_categories,slug',
            'title' => 'required|string|max:255',
            'keywords' => 'nullable|string|max:500',
            'redirect_url' => 'nullable|string|max:500',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'boolean',
        ]);

        KioskCategory::create([
            'slug' => $validated['slug'],
            'title' => $validated['title'],
            'keywords' => $validated['keywords'] ?? '',
            'redirect_url' => ! empty($validated['redirect_url']) ? $validated['redirect_url'] : null,
            'sort_order' => $validated['sort_order'] ?? 0,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return redirect()
            ->route('admin.kiosk.index')
            ->with('success', 'Category created successfully.');
    }

    public function edit(KioskCategory $kiosk): Response
    {
        return Inertia::render('admin/kiosk-categories/edit', [
            'kiosk' => [
                'id' => $kiosk->id,
                'slug' => $kiosk->slug,
                'title' => $kiosk->title,
                'keywords' => $kiosk->keywords ?? '',
                'redirect_url' => $kiosk->redirect_url ?? '',
                'sort_order' => $kiosk->sort_order,
                'is_active' => (bool) $kiosk->is_active,
            ],
        ]);
    }

    public function updateHero(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'hero.title' => 'required|string|max:255',
            'hero.subtitle' => 'nullable|string|max:500',
        ]);

        AdminSetting::set('kiosk_hero', [
            'title' => $validated['hero']['title'],
            'subtitle' => $validated['hero']['subtitle'] ?? '',
        ], 'json');

        return back()->with('success', 'Hero updated successfully.');
    }

    public function updateCategory(Request $request, KioskCategory $kiosk): RedirectResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'keywords' => 'nullable|string|max:500',
            'redirect_url' => 'nullable|string|max:500',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
        ]);

        $kiosk->update([
            'title' => $validated['title'],
            'keywords' => $validated['keywords'] ?? '',
            'redirect_url' => ! empty($validated['redirect_url']) ? $validated['redirect_url'] : null,
            'sort_order' => $validated['sort_order'] ?? $kiosk->sort_order,
            'is_active' => $validated['is_active'] ?? $kiosk->is_active,
        ]);

        return back()->with('success', 'Category updated successfully.');
    }

    public function toggleActive(KioskCategory $kiosk): RedirectResponse
    {
        $kiosk->update(['is_active' => ! $kiosk->is_active]);

        return back()->with('success', $kiosk->is_active ? 'Category is now active.' : 'Category is now inactive.');
    }

    public function destroy(KioskCategory $kiosk): RedirectResponse
    {
        $kiosk->delete();

        return back()->with('success', 'Category deleted. Re-run the Kiosk seeder to restore default categories.');
    }
}
