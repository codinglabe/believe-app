<?php

namespace App\Http\Controllers;

use App\Models\AdminSetting;
use App\Models\KioskCategory;
use App\Models\KioskService;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Contracts\Auth\Authenticatable;
use Inertia\Inertia;
use Inertia\Response;

class KioskController extends Controller
{
    /**
     * Supporter (role "user") city/state from profile — used for kiosk local browsing.
     *
     * @return array{city: string, state: string, zipcode: string|null, label: string}|null
     */
    protected function supporterLocationFromUser(?Authenticatable $user): ?array
    {
        if (! $user instanceof User) {
            return null;
        }
        if (($user->role ?? '') !== 'user') {
            return null;
        }
        $city = trim((string) ($user->city ?? ''));
        $state = trim((string) ($user->state ?? ''));
        if ($city === '' || $state === '') {
            return null;
        }

        $stateUpper = strtoupper($state);

        return [
            'city' => $user->city,
            'state' => $stateUpper,
            'zipcode' => $user->zipcode ? (string) $user->zipcode : null,
            'label' => $city.', '.$stateUpper,
        ];
    }

    /**
     * Session key: null = fall back to supporter profile (if any), else show all.
     * type "all" = user chose every location. type "manual" = state/city from dropdowns.
     *
     * @return array{0: ?string, 1: ?string, 2: bool} state, city, all_locations_effective
     */
    protected function resolveKioskGeoFromSessionAndProfile(Request $request, ?array $supporterLocation): array
    {
        $sessionLoc = $request->session()->get('kiosk_location');

        if (is_array($sessionLoc) && ($sessionLoc['type'] ?? '') === 'all') {
            return [null, null, true];
        }

        if (is_array($sessionLoc) && ($sessionLoc['type'] ?? '') === 'manual') {
            $s = isset($sessionLoc['state']) && $sessionLoc['state'] !== '' ? (string) $sessionLoc['state'] : null;
            $c = isset($sessionLoc['city']) && $sessionLoc['city'] !== '' ? (string) $sessionLoc['city'] : null;

            return [$s, $c, false];
        }

        if ($supporterLocation !== null) {
            return [$supporterLocation['state'], $supporterLocation['city'], false];
        }

        return [null, null, true];
    }

    public function updateServicesGeo(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'state' => ['nullable', 'string', 'max:10'],
            'city' => ['nullable', 'string', 'max:255'],
            'all_locations' => ['sometimes', 'boolean'],
            'use_profile' => ['sometimes', 'boolean'],
            'category' => ['nullable', 'string', 'max:255'],
            'subcategory' => ['nullable', 'string', 'max:255'],
            'search' => ['nullable', 'string', 'max:500'],
        ]);

        if ($request->boolean('use_profile')) {
            $request->session()->forget('kiosk_location');
        } elseif ($request->boolean('all_locations')) {
            $request->session()->put('kiosk_location', ['type' => 'all']);
        } else {
            $state = filled($validated['state'] ?? null) ? strtoupper((string) $validated['state']) : null;
            $city = filled($validated['city'] ?? null) ? (string) $validated['city'] : null;

            if ($state === null && $city === null) {
                $request->session()->put('kiosk_location', ['type' => 'all']);
            } else {
                $request->session()->put('kiosk_location', [
                    'type' => 'manual',
                    'state' => $state,
                    'city' => $city,
                ]);
            }
        }

        $query = array_filter([
            'category' => $validated['category'] ?? null,
            'subcategory' => $validated['subcategory'] ?? null,
            'search' => $validated['search'] ?? null,
        ], fn ($v) => filled($v));

        return redirect()->route('kiosk.services', $query);
    }

    public function index(Request $request): Response
    {
        if (KioskCategory::count() === 0) {
            \Artisan::call('db:seed', ['--class' => \Database\Seeders\KioskCategoriesSeeder::class]);
        }

        $categories = KioskCategory::active()
            ->orderBy('sort_order')
            ->get()
            ->map(fn ($c) => [
                'slug' => $c->slug,
                'title' => $c->title,
                'keywords' => $c->keywords ?? '',
                'redirect_url' => $c->redirect_url ?? '',
            ]);

        $hero = AdminSetting::get('kiosk_hero', null);
        if (! is_array($hero)) {
            $hero = [
                'title' => 'How can we help today?',
                'subtitle' => 'Find assistance with bills, healthcare, government services, jobs, housing, and more',
            ];
        }

        $user = $request->user();
        $supporterLocation = $this->supporterLocationFromUser($user);
        $supporterNeedsLocation = $user instanceof User
            && ($user->role ?? '') === 'user'
            && $supporterLocation === null;

        return Inertia::render('frontend/Kiosk', [
            'seo' => [
                'title' => 'Kiosk - ' . ($hero['title'] ?? 'How can we help today?'),
                'description' => $hero['subtitle'] ?? 'Find assistance with bills, healthcare, government services, jobs, housing, and more.',
            ],
            'hero' => $hero,
            'categories' => $categories,
            'supporterLocation' => $supporterLocation,
            'supporterNeedsLocation' => $supporterNeedsLocation,
        ]);
    }

    public function services(Request $request): Response|RedirectResponse
    {
        $category = $request->query('category');
        $subcategory = $request->query('subcategory');
        $search = $request->query('search');

        $user = $request->user();
        $supporterLocation = $this->supporterLocationFromUser($user);
        $supporterNeedsLocation = $user instanceof User
            && ($user->role ?? '') === 'user'
            && $supporterLocation === null;

        if ($request->boolean('all_locations')) {
            $request->session()->put('kiosk_location', ['type' => 'all']);

            return redirect()->route('kiosk.services', array_filter([
                'category' => $category,
                'subcategory' => $subcategory,
                'search' => $search,
                'page' => $request->query('page'),
            ], fn ($v) => filled($v)));
        }

        if ($request->filled('state') || $request->filled('city')) {
            return redirect()->route('kiosk.services', array_filter([
                'category' => $category,
                'subcategory' => $subcategory,
                'search' => $search,
                'page' => $request->query('page'),
            ], fn ($v) => filled($v)));
        }

        [$state, $city, $allLocationsEffective] = $this->resolveKioskGeoFromSessionAndProfile($request, $supporterLocation);

        $baseQuery = KioskService::active()
            ->inCategory($category)
            ->inState($state)
            ->inCity($city)
            ->subcategory($subcategory)
            ->search($search);

        $services = $baseQuery->with('category')
            ->orderBy('category_sort')
            ->orderBy('item_sort_within_category')
            ->orderBy('display_name')
            ->paginate(12)
            ->withQueryString()
            ->through(fn ($s) => [
                'id' => $s->id,
                'display_name' => $s->display_name,
                'subcategory' => $s->subcategory,
                'category_slug' => $s->category_slug,
                'category_title' => $s->category?->title ?? $s->category_slug,
                'url' => $s->url,
                'launch_type' => $s->launch_type,
            ]);

        $categoriesForFilter = KioskCategory::active()
            ->orderBy('sort_order')
            ->get(['slug', 'title'])
            ->map(fn ($c) => ['value' => $c->slug, 'label' => $c->title])
            ->all();

        $statesQuery = KioskService::active()->distinct()->whereNotNull('state')->where('state', '!=', '');
        $states = $statesQuery->orderBy('state')->pluck('state')->map(fn ($s) => ['value' => $s, 'label' => $s])->values()->all();

        $citiesQuery = KioskService::active()->distinct()->whereNotNull('city')->where('city', '!=', '');
        $citiesQuery->inCategory($category)->inState($state);
        $cities = $citiesQuery->orderBy('city')->pluck('city')->map(fn ($c) => ['value' => $c, 'label' => $c])->values()->all();

        $subcategoriesQuery = KioskService::active()->distinct()->whereNotNull('subcategory')->where('subcategory', '!=', '');
        $subcategoriesQuery->inCategory($category)->inState($state)->inCity($city);
        $subcategories = $subcategoriesQuery->orderBy('subcategory')->pluck('subcategory')->map(fn ($s) => ['value' => $s, 'label' => $s])->values()->all();

        $hero = AdminSetting::get('kiosk_hero', null);
        if (! is_array($hero)) {
            $hero = ['title' => 'How can we help today?', 'subtitle' => 'Find assistance with bills, healthcare, government services, jobs, housing, and more'];
        }

        return Inertia::render('frontend/KioskServices', [
            'seo' => [
                'title' => 'Kiosk Services',
                'description' => 'Browse services by state, city, category, and subcategory.',
            ],
            'hero' => $hero,
            'services' => $services,
            'supporterLocation' => $supporterLocation,
            'supporterNeedsLocation' => $supporterNeedsLocation,
            'filters' => [
                'state' => $state,
                'city' => $city,
                'category' => $category,
                'subcategory' => $subcategory,
                'search' => $search,
                'all_locations' => $allLocationsEffective,
            ],
            'filterOptions' => [
                'states' => $states,
                'cities' => $cities,
                'categories' => $categoriesForFilter,
                'subcategories' => $subcategories,
            ],
        ]);
    }
}
