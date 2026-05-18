<?php

namespace App\Http\Controllers\Organization;

use App\Http\Controllers\Controller;
use App\Models\KioskCategory;
use App\Models\KioskProvider;
use App\Models\KioskServiceRequest;
use App\Models\KioskSubcategory;
use App\Models\Organization;
use App\Models\User;
use App\Services\KioskProviderAiIngestService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class OrganizationKioskProviderController extends Controller
{
    protected function ownedOrganization(Request $request): Organization
    {
        $user = $request->user();
        if (! $user instanceof User) {
            abort(403, 'You do not have permission to manage this organization.');
        }

        $organization = Organization::forAuthUser($user);
        if (! $organization || $organization->user_id !== $user->id) {
            abort(403, 'You do not have permission to manage this organization.');
        }

        return $organization;
    }

    protected function ensureOrgOwnsListing(Organization $org, KioskProvider $kioskProvider): void
    {
        if ($kioskProvider->organization_id === null || (int) $kioskProvider->organization_id !== (int) $org->id) {
            abort(403, 'You can only edit listings created by your organization.');
        }
    }

    public function index(Request $request): Response
    {
        $org = $this->ownedOrganization($request);

        $perPage = min(100, max(1, (int) $request->query('per_page', 12)));

        $q = KioskProvider::query()
            ->orderBy('state_abbr')
            ->orderBy('normalized_city')
            ->orderBy('zip_normalized')
            ->orderBy('name');

        if ($request->filled('city')) {
            $city = trim((string) $request->query('city'));
            if ($city !== '') {
                $q->where('normalized_city', $city);
            }
        }

        if ($request->filled('zip')) {
            $zip = KioskProviderAiIngestService::normalizeZip((string) $request->query('zip'));
            if ($zip !== '') {
                $q->where('zip_normalized', $zip);
            }
        }

        if ($request->filled('state')) {
            $st = KioskProviderAiIngestService::normalizeStateAbbr((string) $request->query('state'));
            if (strlen($st) === 2) {
                $q->where('state_abbr', $st);
            }
        }

        $providers = $q->paginate($perPage)
            ->through(fn (KioskProvider $p) => $this->serializeProviderForOrgBrowse($p))
            ->withQueryString();

        return Inertia::render('Organization/kiosk-providers/Index', [
            'current_organization_id' => $org->id,
            'providers' => $providers,
            'filters' => [
                'city' => $request->query('city'),
                'zip' => $request->query('zip'),
                'state' => $request->query('state'),
            ],
            'filter_options' => $this->kioskLocationFilterOptions(),
        ]);
    }

    public function show(Request $request, KioskProvider $kioskProvider): Response
    {
        $org = $this->ownedOrganization($request);
        $kioskProvider->load(['category']);

        return Inertia::render('Organization/kiosk-providers/Show', [
            'current_organization_id' => $org->id,
            'provider' => $this->serializeProviderForOrgShow($kioskProvider),
        ]);
    }

    /**
     * Distinct state / city / ZIP values from {@see KioskProvider} for filter dropdowns.
     *
     * @return array{
     *     states: list<string>,
     *     all_cities: list<string>,
     *     cities_by_state: array<string, list<string>>,
     *     zips_by_state_city: array<string, list<string>>
     * }
     */
    private function kioskLocationFilterOptions(): array
    {
        $allCities = KioskProvider::query()
            ->whereNotNull('normalized_city')
            ->where('normalized_city', '!=', '')
            ->distinct()
            ->orderBy('normalized_city')
            ->pluck('normalized_city')
            ->values()
            ->all();

        $states = KioskProvider::query()
            ->whereNotNull('state_abbr')
            ->where('state_abbr', '!=', '')
            ->distinct()
            ->orderBy('state_abbr')
            ->pluck('state_abbr')
            ->values()
            ->all();

        $cityRows = KioskProvider::query()
            ->select('state_abbr', 'normalized_city')
            ->whereNotNull('normalized_city')
            ->where('normalized_city', '!=', '')
            ->distinct()
            ->orderBy('state_abbr')
            ->orderBy('normalized_city')
            ->get();

        $citiesByState = [];
        foreach ($cityRows as $row) {
            $st = $row->state_abbr;
            if ($st === null || $st === '') {
                continue;
            }
            $city = $row->normalized_city;
            $citiesByState[$st] ??= [];
            if (! in_array($city, $citiesByState[$st], true)) {
                $citiesByState[$st][] = $city;
            }
        }
        foreach ($citiesByState as $st => $cities) {
            sort($cities, SORT_NATURAL);
            $citiesByState[$st] = array_values($cities);
        }

        $zipRows = KioskProvider::query()
            ->select('state_abbr', 'normalized_city', 'zip_normalized')
            ->whereNotNull('zip_normalized')
            ->where('zip_normalized', '!=', '')
            ->distinct()
            ->orderBy('zip_normalized')
            ->get();

        $zipsByStateCity = [];
        foreach ($zipRows as $row) {
            $st = $row->state_abbr;
            $city = $row->normalized_city;
            if ($st === null || $st === '' || $city === null || $city === '') {
                continue;
            }
            $key = $st.'|'.$city;
            $zipsByStateCity[$key] ??= [];
            $zip = $row->zip_normalized;
            if (! in_array($zip, $zipsByStateCity[$key], true)) {
                $zipsByStateCity[$key][] = $zip;
            }
        }
        foreach ($zipsByStateCity as $key => $zips) {
            sort($zips, SORT_NATURAL);
            $zipsByStateCity[$key] = array_values($zips);
        }

        return [
            'states' => $states,
            'all_cities' => $allCities,
            'cities_by_state' => $citiesByState,
            'zips_by_state_city' => $zipsByStateCity,
        ];
    }

    public function create(Request $request): Response
    {
        $this->ownedOrganization($request);

        return Inertia::render('Organization/kiosk-providers/Create', $this->formSharedProps());
    }

    public function store(Request $request): RedirectResponse
    {
        $org = $this->ownedOrganization($request);
        $data = $this->validatedPayload($request);

        $providerSlug = $this->resolveUniqueProviderSlugForOrg(
            $org->id,
            $data['name'],
            $data['provider_slug'] ?? null,
            $data['state_abbr'],
            $data['normalized_city'],
            $data['zip_normalized'],
            $data['category_slug'],
            $data['subcategory_slug'],
            null
        );

        KioskProvider::query()->create([
            'organization_id' => $org->id,
            'state_abbr' => $data['state_abbr'],
            'normalized_city' => $data['normalized_city'],
            'zip_normalized' => $data['zip_normalized'],
            'category_slug' => $data['category_slug'],
            'subcategory_slug' => $data['subcategory_slug'],
            'provider_slug' => $providerSlug,
            'name' => $data['name'],
            'website' => $data['website'],
            'payment_url' => $data['payment_url'],
            'login_url' => $data['login_url'],
            'account_link_supported' => $data['account_link_supported'],
            'meta' => null,
        ]);

        return redirect()->route('organization.kiosk-providers.index')->with('success', 'Kiosk listing added.');
    }

    public function edit(Request $request, KioskProvider $kioskProvider): Response
    {
        $org = $this->ownedOrganization($request);
        $this->ensureOrgOwnsListing($org, $kioskProvider);

        return Inertia::render('Organization/kiosk-providers/Edit', array_merge($this->formSharedProps(), [
            'provider' => $this->serializeProviderForForm($kioskProvider),
        ]));
    }

    public function update(Request $request, KioskProvider $kioskProvider): RedirectResponse
    {
        $org = $this->ownedOrganization($request);
        $this->ensureOrgOwnsListing($org, $kioskProvider);

        $data = $this->validatedPayload($request);

        $providerSlug = $this->resolveUniqueProviderSlugForOrg(
            $org->id,
            $data['name'],
            $data['provider_slug'] ?? null,
            $data['state_abbr'],
            $data['normalized_city'],
            $data['zip_normalized'],
            $data['category_slug'],
            $data['subcategory_slug'],
            $kioskProvider->id
        );

        $kioskProvider->update([
            'state_abbr' => $data['state_abbr'],
            'normalized_city' => $data['normalized_city'],
            'zip_normalized' => $data['zip_normalized'],
            'category_slug' => $data['category_slug'],
            'subcategory_slug' => $data['subcategory_slug'],
            'provider_slug' => $providerSlug,
            'name' => $data['name'],
            'website' => $data['website'],
            'payment_url' => $data['payment_url'],
            'login_url' => $data['login_url'],
            'account_link_supported' => $data['account_link_supported'],
        ]);

        return redirect()
            ->route('organization.kiosk-providers.show', $kioskProvider)
            ->with('success', 'Kiosk listing updated.');
    }

    public function destroy(Request $request, KioskProvider $kioskProvider): RedirectResponse
    {
        $org = $this->ownedOrganization($request);
        $this->ensureOrgOwnsListing($org, $kioskProvider);

        KioskServiceRequest::query()
            ->where('approved_kiosk_provider_id', $kioskProvider->id)
            ->update(['approved_kiosk_provider_id' => null]);

        $kioskProvider->delete();

        return redirect()
            ->route('organization.kiosk-providers.index')
            ->with('success', 'Kiosk listing removed.');
    }

    /**
     * @return array<string, mixed>
     */
    private function formSharedProps(): array
    {
        $categories = KioskCategory::query()
            ->orderBy('sort_order')
            ->get(['slug', 'title'])
            ->map(fn ($c) => ['slug' => $c->slug, 'title' => $c->title])
            ->values()
            ->all();

        $subcategories = KioskSubcategory::query()
            ->orderBy('category_slug')
            ->orderBy('sort_order')
            ->get(['category_slug', 'name'])
            ->map(fn ($s) => [
                'category_slug' => $s->category_slug,
                'slug' => Str::slug($s->name),
                'name' => $s->name,
            ])
            ->values()
            ->all();

        return [
            'categories' => $categories,
            'subcategories' => $subcategories,
        ];
    }

    /**
     * @return array{
     *     state_abbr: string,
     *     normalized_city: string,
     *     zip_normalized: string,
     *     category_slug: string,
     *     subcategory_slug: string,
     *     provider_slug: string|null,
     *     name: string,
     *     website: string|null,
     *     payment_url: string|null,
     *     login_url: string|null,
     *     account_link_supported: bool
     * }
     */
    private function validatedPayload(Request $request): array
    {
        $validated = $request->validate([
            'state' => ['required', 'string', 'min:2', 'max:32'],
            'city' => ['required', 'string', 'max:128'],
            'zip' => ['nullable', 'string', 'max:32'],
            'category_slug' => ['required', 'string', 'max:64', Rule::exists('kiosk_categories', 'slug')],
            'subcategory' => ['nullable', 'string', 'max:128'],
            'name' => ['required', 'string', 'max:255'],
            'provider_slug' => ['nullable', 'string', 'max:64'],
            'website' => ['nullable', 'string', 'max:500'],
            'payment_url' => ['nullable', 'string', 'max:500'],
            'login_url' => ['nullable', 'string', 'max:500'],
            'account_link_supported' => ['sometimes', 'boolean'],
        ]);

        $stateAbbr = KioskProviderAiIngestService::normalizeStateAbbr($validated['state']);
        if (strlen($stateAbbr) !== 2) {
            throw ValidationException::withMessages([
                'state' => ['Enter a valid 2-letter state code.'],
            ]);
        }

        $normalizedCity = KioskProviderAiIngestService::normalizeCity($validated['city']);
        if ($normalizedCity === '') {
            throw ValidationException::withMessages([
                'city' => ['City is required.'],
            ]);
        }

        $zipNormalized = KioskProviderAiIngestService::normalizeZip($validated['zip'] ?? null);

        $subSlug = Str::slug(trim((string) ($validated['subcategory'] ?? '')));
        if ($subSlug === '') {
            $subSlug = 'general';
        }

        $slugCandidate = isset($validated['provider_slug']) ? trim((string) $validated['provider_slug']) : '';
        $providerSlugInput = $slugCandidate !== '' ? Str::slug($slugCandidate) : null;
        if ($providerSlugInput === '') {
            $providerSlugInput = null;
        }

        return [
            'state_abbr' => $stateAbbr,
            'normalized_city' => $normalizedCity,
            'zip_normalized' => $zipNormalized,
            'category_slug' => $validated['category_slug'],
            'subcategory_slug' => $subSlug,
            'provider_slug' => $providerSlugInput,
            'name' => $validated['name'],
            'website' => $this->nullIfBlank($validated['website'] ?? null),
            'payment_url' => $this->nullIfBlank($validated['payment_url'] ?? null),
            'login_url' => $this->nullIfBlank($validated['login_url'] ?? null),
            'account_link_supported' => $request->boolean('account_link_supported'),
        ];
    }

    private function nullIfBlank(?string $v): ?string
    {
        if ($v === null || trim($v) === '') {
            return null;
        }

        return $v;
    }

    private function resolveUniqueProviderSlugForOrg(
        int $organizationId,
        string $name,
        ?string $requestSlug,
        string $stateAbbr,
        string $normalizedCity,
        string $zipNormalized,
        string $categorySlug,
        string $subcategorySlug,
        ?int $excludeId
    ): string {
        $base = $requestSlug;
        if ($base === null || $base === '') {
            $base = Str::slug(Str::limit($name, 48, ''));
        }
        if ($base === '') {
            $base = 'provider';
        }

        $slug = $base;
        $n = 0;
        while (KioskProvider::query()
            ->where('organization_id', $organizationId)
            ->where('state_abbr', $stateAbbr)
            ->where('normalized_city', $normalizedCity)
            ->where('zip_normalized', $zipNormalized)
            ->where('category_slug', $categorySlug)
            ->where('subcategory_slug', $subcategorySlug)
            ->where('provider_slug', $slug)
            ->when($excludeId, fn ($q) => $q->where('id', '!=', $excludeId))
            ->exists()) {
            $n++;
            $slug = $base.'-'.$n;
        }

        return $slug;
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeProvider(KioskProvider $p): array
    {
        return [
            'id' => $p->id,
            'organization_id' => $p->organization_id,
            'state_abbr' => $p->state_abbr,
            'normalized_city' => $p->normalized_city,
            'zip_normalized' => $p->zip_normalized,
            'category_slug' => $p->category_slug,
            'subcategory_slug' => $p->subcategory_slug,
            'provider_slug' => $p->provider_slug,
            'name' => $p->name,
            'website' => $p->website,
            'payment_url' => $p->payment_url,
            'login_url' => $p->login_url,
            'account_link_supported' => (bool) $p->account_link_supported,
            'updated_at' => $p->updated_at?->toIso8601String(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeProviderForOrgBrowse(KioskProvider $p): array
    {
        return array_merge($this->serializeProvider($p), [
            'is_platform' => $p->organization_id === null,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeProviderForOrgShow(KioskProvider $p): array
    {
        return array_merge($this->serializeProviderForOrgBrowse($p), [
            'category_title' => $p->relationLoaded('category') && $p->category
                ? $p->category->title
                : $p->category_slug,
        ]);
    }

    /**
     * Form-shaped payload for org-owned listing edit (matches Create field names).
     *
     * @return array<string, mixed>
     */
    private function serializeProviderForForm(KioskProvider $p): array
    {
        $subDisplay = '';
        if ($p->subcategory_slug !== 'general') {
            $sub = KioskSubcategory::query()
                ->where('category_slug', $p->category_slug)
                ->get()
                ->first(fn ($s) => Str::slug($s->name) === $p->subcategory_slug);
            $subDisplay = $sub ? $sub->name : str_replace('-', ' ', $p->subcategory_slug);
        }

        return [
            'id' => $p->id,
            'state' => $p->state_abbr,
            'city' => $p->normalized_city,
            'zip' => $p->zip_normalized ?? '',
            'category_slug' => $p->category_slug,
            'subcategory' => $subDisplay,
            'name' => $p->name,
            'website' => $p->website ?? '',
            'payment_url' => $p->payment_url ?? '',
            'login_url' => $p->login_url ?? '',
            'account_link_supported' => (bool) $p->account_link_supported,
        ];
    }
}
