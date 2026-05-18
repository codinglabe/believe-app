<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\KioskCategory;
use App\Models\KioskProvider;
use App\Models\KioskServiceRequest;
use App\Models\KioskSubcategory;
use App\Services\KioskProviderAiIngestService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class KioskProviderController extends Controller
{
    public function __construct()
    {
        $this->middleware(['auth', 'EnsureEmailIsVerified', 'role:admin']);
    }

    public function index(Request $request): Response
    {
        $perPage = min(100, max(10, (int) $request->query('per_page', 10)));

        $q = KioskProvider::query()->orderByDesc('updated_at');

        if ($request->filled('search')) {
            $term = '%'.trim((string) $request->query('search')).'%';
            $q->where(function ($inner) use ($term) {
                $inner->where('name', 'like', $term)
                    ->orWhere('provider_slug', 'like', $term)
                    ->orWhere('category_slug', 'like', $term)
                    ->orWhere('subcategory_slug', 'like', $term)
                    ->orWhere('normalized_city', 'like', $term)
                    ->orWhere('state_abbr', 'like', $term)
                    ->orWhere('website', 'like', $term);
            });
        }

        if ($request->filled('category_slug')) {
            $q->where('category_slug', (string) $request->query('category_slug'));
        }

        if ($request->filled('state_abbr')) {
            $q->where('state_abbr', KioskProviderAiIngestService::normalizeStateAbbr((string) $request->query('state_abbr')));
        }

        $providers = $q->paginate($perPage)->through(fn (KioskProvider $p) => $this->serializeProvider($p));

        $categories = KioskCategory::query()
            ->orderBy('sort_order')
            ->get(['slug', 'title'])
            ->map(fn ($c) => ['slug' => $c->slug, 'title' => $c->title])
            ->values()
            ->all();

        return Inertia::render('admin/kiosk-providers/index', [
            'providers' => $providers,
            'categories' => $categories,
            'filters' => [
                'search' => $request->query('search'),
                'category_slug' => $request->query('category_slug'),
                'state_abbr' => $request->query('state_abbr'),
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/kiosk-providers/create', $this->formSharedProps());
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validatedPayload($request);

        $providerSlug = $this->resolveUniqueProviderSlug(
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
            'organization_id' => null,
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

        return redirect()->route('admin.kiosk.providers.index')->with('success', 'Provider created.');
    }

    public function edit(KioskProvider $kioskProvider): Response
    {
        return Inertia::render('admin/kiosk-providers/edit', array_merge($this->formSharedProps(), [
            'provider' => $this->serializeProvider($kioskProvider),
        ]));
    }

    public function update(Request $request, KioskProvider $kioskProvider): RedirectResponse
    {
        $data = $this->validatedPayload($request);

        $providerSlug = $this->resolveUniqueProviderSlug(
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
            'organization_id' => null,
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

        return redirect()->route('admin.kiosk.providers.index')->with('success', 'Provider updated.');
    }

    public function destroy(KioskProvider $kioskProvider): RedirectResponse
    {
        DB::transaction(function () use ($kioskProvider) {
            KioskServiceRequest::query()
                ->where('approved_kiosk_provider_id', $kioskProvider->id)
                ->update(['approved_kiosk_provider_id' => null]);
            $kioskProvider->delete();
        });

        return redirect()->route('admin.kiosk.providers.index')->with('success', 'Provider deleted.');
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

    private function resolveUniqueProviderSlug(
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
            ->whereNull('organization_id')
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
            'meta' => $p->meta,
            'updated_at' => $p->updated_at?->toIso8601String(),
        ];
    }
}
