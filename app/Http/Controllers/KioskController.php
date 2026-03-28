<?php

namespace App\Http\Controllers;

use App\Models\AdminSetting;
use App\Models\KioskCategory;
use App\Models\KioskProvider;
use App\Models\KioskSubcategory;
use App\Models\User;
use App\Services\KioskProviderAiIngestService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Support\Str;
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
        $cityRaw = trim((string) ($user->city ?? ''));
        $stateRaw = trim((string) ($user->state ?? ''));
        if ($cityRaw === '' || $stateRaw === '') {
            return null;
        }

        // Same canonical form as kiosk_providers + profile save — avoids missing rows due to casing/spacing.
        $cityNorm = KioskProviderAiIngestService::normalizeCity($cityRaw);
        $stateNorm = KioskProviderAiIngestService::normalizeStateAbbr($stateRaw);
        $zipNorm = null;
        if ($user->zipcode !== null && trim((string) $user->zipcode) !== '') {
            $z = substr(KioskProviderAiIngestService::normalizeZip((string) $user->zipcode), 0, 10);
            $zipNorm = $z !== '' ? $z : null;
        }

        return [
            'city' => $cityNorm,
            'state' => $stateNorm,
            'zipcode' => $zipNorm,
            'label' => $cityNorm.', '.$stateNorm,
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
            $s = isset($sessionLoc['state']) && $sessionLoc['state'] !== ''
                ? KioskProviderAiIngestService::normalizeStateAbbr((string) $sessionLoc['state'])
                : null;
            $c = isset($sessionLoc['city']) && $sessionLoc['city'] !== ''
                ? KioskProviderAiIngestService::normalizeCity((string) $sessionLoc['city'])
                : null;

            return [$s, $c, false];
        }

        if ($supporterLocation !== null) {
            return [$supporterLocation['state'], $supporterLocation['city'], false];
        }

        return [null, null, true];
    }

    /**
     * Public kiosk lists only {@see KioskProvider} rows (AI ingest + approved user requests).
     */
    protected function kioskProvidersBaseQuery(
        Request $request,
        ?string $state,
        ?string $city,
        bool $allLocationsEffective,
        ?string $category,
        ?string $subcategory,
        ?string $search
    ): Builder {
        $q = KioskProvider::query();

        // Geo: apply incrementally (state-only, or state+city+zip). Previously required both state and city,
        // so changing only "State" or using "All cities" applied no geo filter and results never matched the UI.
        if (! $allLocationsEffective) {
            $hasState = $state !== null && trim((string) $state) !== '';
            $hasCity = $city !== null && trim((string) $city) !== '';

            if ($hasState) {
                $q->where('state_abbr', KioskProviderAiIngestService::normalizeStateAbbr($state));
            }
            if ($hasCity) {
                $normalizedCity = KioskProviderAiIngestService::normalizeCity($city);
                $q->where('normalized_city', $normalizedCity);

                $zipNormalized = '';
                $user = $request->user();
                if ($user instanceof User && filled($user->zipcode ?? null)) {
                    $zipNormalized = KioskProviderAiIngestService::normalizeZip((string) $user->zipcode);
                }
                $q->where(function ($inner) use ($zipNormalized) {
                    $inner->where('zip_normalized', $zipNormalized);
                    if ($zipNormalized !== '') {
                        $inner->orWhere('zip_normalized', '');
                    }
                });
            }
        }

        if (filled($category)) {
            $q->where('category_slug', $category);
        }
        if (filled($subcategory)) {
            $q->where('subcategory_slug', $subcategory);
        }
        if (filled($search)) {
            $s = $search;
            $q->where(function ($inner) use ($s) {
                $inner->where('name', 'like', '%'.$s.'%')
                    ->orWhere('subcategory_slug', 'like', '%'.$s.'%')
                    ->orWhere('website', 'like', '%'.$s.'%');
            });
        }

        return $q->orderBy('subcategory_slug')->orderBy('name');
    }

    /**
     * Total providers for resolved geo (all categories), for kiosk home teaser — not used when “all locations”.
     */
    protected function kioskProviderCountForResolvedGeo(
        Request $request,
        ?string $state,
        ?string $city,
        bool $allLocationsEffective
    ): int {
        if ($allLocationsEffective || $state === null || trim((string) $state) === '') {
            return 0;
        }

        return (int) $this->kioskProvidersBaseQuery($request, $state, $city, false, null, null, null)->count();
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
            $state = filled($validated['state'] ?? null)
                ? KioskProviderAiIngestService::normalizeStateAbbr((string) $validated['state'])
                : null;
            $city = filled($validated['city'] ?? null)
                ? KioskProviderAiIngestService::normalizeCity((string) $validated['city'])
                : null;

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

        [$state, $city, $allLocationsEffective] = $this->resolveKioskGeoFromSessionAndProfile($request, $supporterLocation);
        $localProviderCount = $this->kioskProviderCountForResolvedGeo($request, $state, $city, $allLocationsEffective);

        return Inertia::render('frontend/Kiosk', [
            'seo' => [
                'title' => 'Kiosk - '.($hero['title'] ?? 'How can we help today?'),
                'description' => $hero['subtitle'] ?? 'Find assistance with bills, healthcare, government services, jobs, housing, and more.',
            ],
            'hero' => $hero,
            'categories' => $categories,
            'supporterLocation' => $supporterLocation,
            'supporterNeedsLocation' => $supporterNeedsLocation,
            'localProviderCount' => $localProviderCount,
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

        $providers = $this->kioskProvidersBaseQuery(
            $request,
            $state,
            $city,
            $allLocationsEffective,
            $category,
            $subcategory,
            $search
        )->paginate(12)
            ->withQueryString()
            ->through(fn (KioskProvider $p) => [
                'id' => $p->id,
                'name' => $p->name,
                'category_slug' => $p->category_slug,
                'subcategory_slug' => $p->subcategory_slug,
                'website' => $p->website,
                'payment_url' => $p->payment_url,
                'login_url' => $p->login_url,
                'account_link_supported' => (bool) $p->account_link_supported,
            ]);

        $categoriesForFilter = KioskCategory::active()
            ->orderBy('sort_order')
            ->get(['slug', 'title'])
            ->map(fn ($c) => ['value' => $c->slug, 'label' => $c->title])
            ->all();

        $states = KioskProvider::query()
            ->distinct()
            ->orderBy('state_abbr')
            ->pluck('state_abbr')
            ->map(fn ($s) => ['value' => $s, 'label' => $s])
            ->values()
            ->all();

        $citiesQuery = KioskProvider::query()
            ->distinct()
            ->whereNotNull('normalized_city')
            ->where('normalized_city', '!=', '');
        if (filled($state)) {
            $citiesQuery->where('state_abbr', KioskProviderAiIngestService::normalizeStateAbbr($state));
        }
        if (filled($category)) {
            $citiesQuery->where('category_slug', $category);
        }
        $cities = $citiesQuery->orderBy('normalized_city')
            ->pluck('normalized_city')
            ->map(fn ($c) => ['value' => $c, 'label' => $c])
            ->values()
            ->all();

        $subcategoriesQuery = KioskProvider::query()
            ->distinct()
            ->where('subcategory_slug', '!=', '');
        if (filled($category)) {
            $subcategoriesQuery->where('category_slug', $category);
        }
        if (filled($state)) {
            $subcategoriesQuery->where('state_abbr', KioskProviderAiIngestService::normalizeStateAbbr($state));
        }
        if (filled($city)) {
            $subcategoriesQuery->where('normalized_city', KioskProviderAiIngestService::normalizeCity($city));
        }
        $subcategories = $subcategoriesQuery->orderBy('subcategory_slug')
            ->pluck('subcategory_slug')
            ->map(fn ($s) => ['value' => $s, 'label' => Str::title(str_replace('-', ' ', $s))])
            ->values()
            ->all();

        $hero = AdminSetting::get('kiosk_hero', null);
        if (! is_array($hero)) {
            $hero = ['title' => 'How can we help today?', 'subtitle' => 'Find assistance with bills, healthcare, government services, jobs, housing, and more'];
        }

        // Service-request form: subcategories loaded per selected category. `kiosk_request_category` triggers
        // Inertia partial reload (only requestSubcategoryOptions); otherwise fall back to page filter category.
        if ($request->has('kiosk_request_category')) {
            $formCategorySlug = (string) $request->query('kiosk_request_category');
            $requestSubcategoryOptions = filled($formCategorySlug)
                ? $this->requestSubcategoryOptionsForCategory($formCategorySlug)
                : [];
        } elseif (filled($category)) {
            $requestSubcategoryOptions = $this->requestSubcategoryOptionsForCategory((string) $category);
        } else {
            $requestSubcategoryOptions = [];
        }

        return Inertia::render('frontend/KioskServices', [
            'seo' => [
                'title' => 'Kiosk Services',
                'description' => 'Browse local providers by state, city, category, and subcategory.',
            ],
            'hero' => $hero,
            'providers' => $providers,
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
            'requestSubcategoryOptions' => $requestSubcategoryOptions,
        ]);
    }

    /**
     * @return list<array{id: int, category_slug: string, value: string, label: string}>
     */
    protected function requestSubcategoryOptionsForCategory(string $categorySlug): array
    {
        return KioskSubcategory::query()
            ->where('category_slug', $categorySlug)
            ->orderBy('sort_order')
            ->get(['id', 'category_slug', 'name'])
            ->map(fn ($s) => [
                'id' => $s->id,
                'category_slug' => $s->category_slug,
                'value' => $s->name,
                'label' => $s->name,
            ])
            ->values()
            ->all();
    }
}
