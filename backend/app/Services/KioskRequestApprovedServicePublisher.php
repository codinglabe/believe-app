<?php

namespace App\Services;

use App\Models\KioskProvider;
use App\Models\KioskServiceRequest;
use App\Models\KioskSubcategory;
use Illuminate\Support\Str;

class KioskRequestApprovedServicePublisher
{
    /**
     * Create or update a {@see KioskProvider} row for an approved request (same table as AI ingest).
     */
    public function publish(KioskServiceRequest $request): KioskProvider
    {
        $stateAbbr = KioskProviderAiIngestService::normalizeStateAbbr($request->state ?? '');
        $normalizedCity = KioskProviderAiIngestService::normalizeCity($request->city ?? '');
        if (strlen($stateAbbr) !== 2) {
            $stateAbbr = 'ZZ';
        }
        if ($normalizedCity === '') {
            $normalizedCity = 'Unknown';
        }

        $zipNormalized = '';

        $subSlug = Str::slug($request->subcategory ?: 'general');
        if ($subSlug === '') {
            $subSlug = 'general';
        }

        $providerSlugBase = Str::slug(Str::limit($request->display_name, 48, ''));
        $providerSlug = $providerSlugBase !== '' ? $providerSlugBase : 'provider';
        $n = 0;
        $excludeId = (int) ($request->approved_kiosk_provider_id ?? 0);

        while (KioskProvider::query()
            ->where('state_abbr', $stateAbbr)
            ->where('normalized_city', $normalizedCity)
            ->where('zip_normalized', $zipNormalized)
            ->where('category_slug', $request->category_slug)
            ->where('subcategory_slug', $subSlug)
            ->where('provider_slug', $providerSlug)
            ->when($excludeId > 0, fn ($q) => $q->where('id', '!=', $excludeId))
            ->exists()) {
            $n++;
            $providerSlug = $providerSlugBase.'-'.$n;
        }

        $payload = [
            'state_abbr' => $stateAbbr,
            'normalized_city' => $normalizedCity,
            'zip_normalized' => $zipNormalized,
            'category_slug' => $request->category_slug,
            'subcategory_slug' => $subSlug,
            'provider_slug' => $providerSlug,
            'name' => $request->display_name,
            'website' => $request->url,
            'payment_url' => null,
            'login_url' => null,
            'account_link_supported' => false,
            'meta' => array_filter([
                'source' => 'user_request',
                'request_id' => $request->id,
                'market_code' => $request->market_code,
            ]),
        ];

        if ($excludeId > 0) {
            $existing = KioskProvider::query()->find($excludeId);
            if ($existing) {
                $existing->update($payload);

                return $existing->fresh();
            }
        }

        $provider = KioskProvider::create($payload);

        if (! empty($request->subcategory)) {
            KioskSubcategory::firstOrCreate(
                ['category_slug' => $request->category_slug, 'name' => $request->subcategory],
                ['sort_order' => ((int) KioskSubcategory::where('category_slug', $request->category_slug)->max('sort_order')) + 1]
            );
        }

        return $provider;
    }

    /**
     * Remove the linked kiosk provider when a request is no longer approved.
     */
    public function unpublishLinkedService(?int $approvedKioskProviderId): void
    {
        if (! $approvedKioskProviderId) {
            return;
        }
        KioskProvider::query()->whereKey($approvedKioskProviderId)->delete();
    }
}
