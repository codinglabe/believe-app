<?php

namespace App\Services;

use App\Models\KioskCategory;
use App\Models\KioskGeoIngestion;
use App\Models\KioskProvider;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class KioskProviderAiIngestService
{
    public function __construct(
        protected OpenAiService $openAiService
    ) {}

    public static function normalizeCity(string $city): string
    {
        return Str::of(trim($city))->title()->toString();
    }

    public static function normalizeStateAbbr(string $state): string
    {
        return strtoupper(substr(trim($state), 0, 2));
    }

    public static function normalizeZip(?string $zip): string
    {
        if ($zip === null || trim($zip) === '') {
            return '';
        }

        return substr(preg_replace('/\D/', '', $zip) ?? '', 0, 16);
    }

    public function shouldSkipFreshIngestion(string $stateAbbr, string $normalizedCity, string $zipNormalized): bool
    {
        $ttl = (int) config('services.kiosk_provider_ingest.cache_ttl_days', 30);
        if ($ttl <= 0) {
            return false;
        }

        return KioskGeoIngestion::query()
            ->where('state_abbr', $stateAbbr)
            ->where('normalized_city', $normalizedCity)
            ->where('zip_normalized', $zipNormalized)
            ->where('status', 'success')
            ->whereNotNull('last_ingested_at')
            ->where('last_ingested_at', '>=', now()->subDays($ttl))
            ->exists();
    }

    /**
     * @param  bool  $force  When true, bypass TTL cache so monthly refresh and manual reruns always call OpenAI (updated links / new providers).
     * @return array{skipped: bool, provider_count: int, tokens: int, message: string}
     */
    public function ingest(string $stateAbbr, string $rawCity, ?string $zip = null, bool $force = false): array
    {
        if (! config('services.kiosk_provider_ingest.enabled', true)) {
            return ['skipped' => true, 'provider_count' => 0, 'tokens' => 0, 'message' => 'Ingest disabled.'];
        }

        $stateAbbr = self::normalizeStateAbbr($stateAbbr);
        $normalizedCity = self::normalizeCity($rawCity);
        $zipNormalized = self::normalizeZip($zip);

        if ($normalizedCity === '' || strlen($stateAbbr) !== 2) {
            return ['skipped' => true, 'provider_count' => 0, 'tokens' => 0, 'message' => 'Missing city or state.'];
        }

        if (! $force && $this->shouldSkipFreshIngestion($stateAbbr, $normalizedCity, $zipNormalized)) {
            return ['skipped' => true, 'provider_count' => 0, 'tokens' => 0, 'message' => 'Recent successful ingest exists for this geo.'];
        }

        $ingestion = KioskGeoIngestion::query()->updateOrCreate(
            [
                'state_abbr' => $stateAbbr,
                'normalized_city' => $normalizedCity,
                'zip_normalized' => $zipNormalized,
            ],
            [
                'status' => 'pending',
                'error_message' => null,
            ]
        );

        $allowedSlugs = KioskCategory::query()->active()->orderBy('sort_order')->pluck('slug')->all();
        if ($allowedSlugs === []) {
            $allowedSlugs = KioskCategory::query()->orderBy('sort_order')->pluck('slug')->all();
        }

        try {
            $messages = $this->buildMessages($stateAbbr, $normalizedCity, $zipNormalized, $allowedSlugs);
            $res = $this->openAiService->chatCompletionJson($messages);

            if (($res['finish_reason'] ?? '') === 'length') {
                throw new \RuntimeException(
                    'OpenAI response was truncated at the token limit; provider list may be incomplete. '.
                    'Increase KIOSK_PROVIDER_INGEST_MAX_TOKENS in .env or use a model with a higher output cap.'
                );
            }

            $parsed = $this->decodeResponseJson($res['content']);
            $rows = $this->flattenToProviderRows(
                $parsed,
                $stateAbbr,
                $normalizedCity,
                $zipNormalized,
                $allowedSlugs
            );

            $this->logMissingCategories($allowedSlugs, $rows, $stateAbbr, $normalizedCity);

            DB::transaction(function () use ($stateAbbr, $normalizedCity, $zipNormalized, $rows, $ingestion) {
                KioskProvider::query()
                    ->where('state_abbr', $stateAbbr)
                    ->where('normalized_city', $normalizedCity)
                    ->where('zip_normalized', $zipNormalized)
                    ->delete();

                foreach ($rows as $row) {
                    KioskProvider::query()->create($row);
                }

                $ingestion->update([
                    'status' => 'success',
                    'provider_count' => count($rows),
                    'error_message' => null,
                    'last_ingested_at' => now(),
                ]);
            });

            return [
                'skipped' => false,
                'provider_count' => count($rows),
                'tokens' => (int) ($res['total_tokens'] ?? 0),
                'message' => 'OK',
            ];
        } catch (\Throwable $e) {
            Log::error('KioskProviderAiIngest failed', [
                'state' => $stateAbbr,
                'city' => $normalizedCity,
                'error' => $e->getMessage(),
            ]);

            $ingestion->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
                'last_ingested_at' => now(),
            ]);

            return [
                'skipped' => false,
                'provider_count' => 0,
                'tokens' => 0,
                'message' => $e->getMessage(),
            ];
        }
    }

    /**
     * @param  list<string>  $allowedSlugs
     * @return list<array<string, mixed>>
     */
    protected function flattenToProviderRows(
        array $parsed,
        string $stateAbbr,
        string $normalizedCity,
        string $zipNormalized,
        array $allowedSlugs
    ): array {
        $allowed = array_flip($allowedSlugs);
        $out = [];
        $seenKeys = [];

        $categories = $parsed['categories'] ?? [];
        if (! is_array($categories)) {
            return [];
        }

        foreach ($categories as $cat) {
            if (! is_array($cat)) {
                continue;
            }
            $rawId = $cat['id'] ?? $cat['slug'] ?? null;
            $categorySlug = $rawId !== null
                ? $this->matchAllowedCategorySlug((string) $rawId, $allowedSlugs)
                : null;
            if (! $categorySlug || ! isset($allowed[$categorySlug])) {
                if ($rawId !== null && $rawId !== '') {
                    Log::debug('Kiosk ingest skipped unknown category id from AI', [
                        'raw_id' => $rawId,
                        'city' => $normalizedCity,
                        'state' => $stateAbbr,
                    ]);
                }

                continue;
            }

            $subcategories = $cat['subcategories'] ?? [];
            if (! is_array($subcategories)) {
                continue;
            }

            foreach ($subcategories as $sub) {
                $subSlug = '';
                if (isset($sub['id'])) {
                    $subSlug = Str::slug((string) $sub['id'], '-');
                } elseif (isset($sub['name'])) {
                    $subSlug = Str::slug((string) $sub['name'], '-');
                }

                $providers = $sub['providers'] ?? [];
                if (! is_array($providers)) {
                    continue;
                }

                foreach ($providers as $p) {
                    if (! is_array($p)) {
                        continue;
                    }
                    $name = trim((string) ($p['name'] ?? ''));
                    if ($name === '') {
                        continue;
                    }

                    $provId = isset($p['id']) ? Str::slug((string) $p['id'], '-') : Str::slug($name, '-');
                    if ($provId === '') {
                        continue;
                    }

                    $dedupeKey = $categorySlug.'|'.$subSlug.'|'.$provId;
                    if (isset($seenKeys[$dedupeKey])) {
                        continue;
                    }
                    $seenKeys[$dedupeKey] = true;

                    $out[] = [
                        'state_abbr' => $stateAbbr,
                        'normalized_city' => $normalizedCity,
                        'zip_normalized' => $zipNormalized,
                        'category_slug' => $categorySlug,
                        'subcategory_slug' => $subSlug,
                        'provider_slug' => substr($provId, 0, 64),
                        'name' => $name,
                        'website' => $this->nullableUrl($p['website'] ?? null),
                        'payment_url' => $this->nullableUrl($p['payment_url'] ?? null),
                        'login_url' => $this->nullableUrl($p['login_url'] ?? null),
                        'account_link_supported' => (bool) ($p['account_link_supported'] ?? false),
                        'meta' => null,
                    ];
                }
            }
        }

        return $out;
    }

    /**
     * Map AI category id/slug to an allowed kiosk category slug so valid rows are not dropped on minor formatting differences.
     *
     * @param  list<string>  $allowedSlugs
     */
    protected function matchAllowedCategorySlug(string $raw, array $allowedSlugs): ?string
    {
        $raw = trim($raw);
        if ($raw === '') {
            return null;
        }

        $normalized = Str::slug(str_replace('_', '-', $raw), '-');

        foreach ($allowedSlugs as $allowed) {
            if ($normalized === $allowed) {
                return $allowed;
            }
        }

        $alnum = static fn (string $s): string => (string) preg_replace('/[^a-z0-9]/i', '', strtolower($s));

        $n = $alnum($normalized);
        foreach ($allowedSlugs as $allowed) {
            if ($n !== '' && $n === $alnum($allowed)) {
                return $allowed;
            }
        }

        return null;
    }

    /**
     * @param  list<string>  $allowedSlugs
     * @param  list<array<string, mixed>>  $rows
     */
    protected function logMissingCategories(array $allowedSlugs, array $rows, string $stateAbbr, string $normalizedCity): void
    {
        $present = [];
        foreach ($rows as $row) {
            if (! empty($row['category_slug'])) {
                $present[$row['category_slug']] = true;
            }
        }
        foreach ($allowedSlugs as $slug) {
            if (! isset($present[$slug])) {
                Log::info('Kiosk ingest: AI returned no providers for category (consider prompt or re-run)', [
                    'category_slug' => $slug,
                    'city' => $normalizedCity,
                    'state' => $stateAbbr,
                ]);
            }
        }
    }

    protected function nullableUrl(mixed $v): ?string
    {
        if ($v === null || $v === '') {
            return null;
        }
        $s = trim((string) $v);
        if ($s === '') {
            return null;
        }
        if (! str_starts_with($s, 'http://') && ! str_starts_with($s, 'https://')) {
            return null;
        }

        return substr($s, 0, 500);
    }

    protected function decodeResponseJson(string $raw): array
    {
        $clean = trim($raw);
        $clean = preg_replace('/^```json\s*/i', '', $clean);
        $clean = preg_replace('/\s*```$/i', '', $clean);
        $clean = trim($clean);

        $data = json_decode($clean, true);
        if (! is_array($data)) {
            throw new \RuntimeException('AI response is not valid JSON.');
        }

        return $data;
    }

    /**
     * @param  list<string>  $allowedSlugs
     * @return list<array{role: string, content: string}>
     */
    protected function buildMessages(string $stateAbbr, string $normalizedCity, string $zipNormalized, array $allowedSlugs): array
    {
        $slugList = implode(', ', $allowedSlugs);

        $system = <<<'SYS'
You output ONLY valid JSON (no markdown). The root object must match this shape:
{
  "categories": [
    {
      "id": "<category_slug>",
      "name": "<display name>",
      "subcategories": [
        {
          "id": "<subcategory_slug>",
          "name": "<display name>",
          "providers": [
            {
              "id": "<provider_slug>",
              "name": "<provider name>",
              "website": "<https url or empty string>",
              "payment_url": "<https url or empty string>",
              "login_url": "<https url or empty string>",
              "account_link_supported": true|false
            }
          ]
        }
      ]
    }
  ]
}

Coverage (critical — do not omit categories or under-serve this city/state):
1) You MUST include one top-level object in "categories" for EVERY allowed category id listed in the user message. Use that exact slug as each category "id" (hyphenated form, e.g. pay-bills).
2) Focus providers on THIS exact US city and state: municipal/county utilities and services that serve residents here, regional agencies, and state portals that residents of this city actually use. Prefer entities operating in or serving this city/county/metro — not generic national lists unrelated to this location.
3) For each category, include multiple subcategories where it makes sense (e.g. utilities: electric, gas, water, waste; government: city, county, state DMV/tax as applicable). Each subcategory should list the main real providers or official portals for this area.
4) Be thorough: residents should not miss major local billers, clinics/hospitals serving the area, transit, housing resources, job portals relevant to the region, etc., when they apply to this city/state.
5) provider "id" must be a short unique slug (lowercase, hyphens) within that category/subcategory.
6) If unsure about a URL, use empty string — do not invent domains. Use HTTPS only when you are confident it is correct.
7) Do not skip a category. If a category has few local entries, still include at least one subcategory (e.g. "general" or "local resources") with the best-fitting real providers for this location.
SYS;

        $zipLine = $zipNormalized !== '' ? "ZIP: {$zipNormalized}" : 'ZIP: (not provided)';

        $user = "Location: {$normalizedCity}, {$stateAbbr}. {$zipLine}.\n"
            ."You MUST return exactly one category block per id below — use these strings verbatim as each category \"id\": {$slugList}.\n"
            ."Cover services and providers that matter to people who live in {$normalizedCity}, {$stateAbbr} (not a generic US-wide list unless it is the correct state/city portal).\n"
            .'Return JSON only.';

        return [
            ['role' => 'system', 'content' => $system],
            ['role' => 'user', 'content' => $user],
        ];
    }
}
