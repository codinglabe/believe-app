<?php

namespace App\Services;

use App\Models\KioskCategory;
use App\Models\KioskService;
use App\Models\KioskServiceRequest;
use App\Models\KioskSubcategory;
use Illuminate\Support\Str;

class KioskRequestApprovedServicePublisher
{
    /**
     * Create or update the kiosk_services row for an approved request.
     */
    public function publish(KioskServiceRequest $request): KioskService
    {
        if (! $request->approved_service_id) {
            $existing = KioskService::query()
                ->where('category_slug', $request->category_slug)
                ->where('display_name', $request->display_name)
                ->where(fn ($q) => $q->where('state', $request->state)->orWhereNull('state'))
                ->where(fn ($q) => $q->where('city', $request->city)->orWhereNull('city'))
                ->first();
            if ($existing) {
                $request->approved_service_id = $existing->id;
            }
        }

        $serviceSlugBase = Str::slug($request->category_slug.'--'.($request->subcategory ?: $request->display_name));
        $serviceSlug = $serviceSlugBase;
        $n = 0;
        $excludeId = $request->approved_service_id ?? 0;
        while (KioskService::where('service_slug', $serviceSlug)->where('id', '!=', $excludeId)->exists()) {
            $n++;
            $serviceSlug = $serviceSlugBase.'-'.$n;
        }

        $categorySort = (int) (KioskCategory::where('slug', $request->category_slug)->value('sort_order') ?? 99);
        $maxItemSort = (int) KioskService::where('category_slug', $request->category_slug)->max('item_sort_within_category');

        $payload = [
            'market_code' => $request->market_code ?: 'USER-REQUEST',
            'state' => $request->state,
            'city' => $request->city,
            'category_slug' => $request->category_slug,
            'subcategory' => $request->subcategory,
            'service_slug' => $serviceSlug,
            'display_name' => $request->display_name,
            'url' => $request->url,
            'launch_type' => $request->url ? 'web_portal' : 'internal_app',
            'jurisdiction_level' => null,
            'jurisdiction_rank' => 7,
            'category_sort' => $categorySort,
            'item_sort_within_category' => max(1, $maxItemSort + 1),
            'is_active' => true,
            'allow_webview' => true,
            'enable_redirect_tracking' => true,
            'internal_product' => null,
            'notes' => trim('User-requested service. '.($request->details ?? '')),
        ];

        if ($request->approved_service_id) {
            $existingRow = KioskService::query()->whereKey($request->approved_service_id)->first();
            if ($existingRow) {
                $payload['item_sort_within_category'] = $existingRow->item_sort_within_category;
            }
            $service = KioskService::updateOrCreate(
                ['id' => $request->approved_service_id],
                $payload
            );
        } else {
            $service = KioskService::create($payload);
        }

        if (! empty($request->subcategory)) {
            KioskSubcategory::firstOrCreate(
                ['category_slug' => $request->category_slug, 'name' => $request->subcategory],
                ['sort_order' => ((int) KioskSubcategory::where('category_slug', $request->category_slug)->max('sort_order')) + 1]
            );
        }

        return $service;
    }

    /**
     * Deactivate the linked kiosk service when request is no longer approved.
     */
    public function unpublishLinkedService(?int $approvedServiceId): void
    {
        if (! $approvedServiceId) {
            return;
        }
        KioskService::whereKey($approvedServiceId)->update(['is_active' => false]);
    }
}
