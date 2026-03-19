<?php

namespace App\Http\Controllers;

use App\Models\KioskCategory;
use App\Models\KioskService;
use App\Models\KioskServiceRequest;
use App\Models\KioskSubcategory;
use App\Services\KioskServiceRequestAiValidator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class KioskServiceRequestController extends Controller
{
    public function __construct(
        protected KioskServiceRequestAiValidator $validator
    ) {}

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'state' => 'nullable|string|max:64',
            'city' => 'nullable|string|max:128',
            'category_slug' => 'required|string|max:64|exists:kiosk_categories,slug',
            'subcategory' => 'nullable|string|max:128',
            'display_name' => 'required|string|max:255',
            'url' => 'nullable|string|max:500',
            'details' => 'nullable|string|max:2000',
        ]);

        $user = $request->user();
        if (! $user) {
            return response()->json(['ok' => false, 'message' => 'Login required.'], 401);
        }

        $validated['requester_name'] = $user->name ?? null;
        $validated['requester_email'] = $user->email ?? null;

        $validated['market_code'] = $this->buildMarketCode(
            $validated['state'] ?? null,
            $validated['city'] ?? null
        );
        $validated['url'] = $this->normalizeUrl($validated['url'] ?? null);

        $requestRow = KioskServiceRequest::create(array_merge($validated, [
            'status' => 'pending',
            'edit_token' => Str::random(40),
        ]));

        $ai = $this->validator->validate($validated);
        $status = strtolower($ai['decision']);
        if (! in_array($status, ['approved', 'pending', 'rejected'], true)) {
            $status = 'pending';
        }

        $requestRow->update([
            'status' => $status,
            'ai_decision' => $status,
            'ai_reason' => $ai['reason'],
            'ai_suggested_url' => $ai['suggested_url'],
            'ai_tokens_used' => (int) ($ai['tokens_used'] ?? 0),
            'resolved_at' => in_array($status, ['approved', 'rejected'], true) ? now() : null,
        ]);

        if ($status === 'approved') {
            $service = $this->createOrUpdateServiceFromRequest($requestRow);
            $requestRow->update([
                'approved_service_id' => $service->id,
                'approved_at' => now(),
            ]);
        }

        return response()->json([
            'ok' => true,
            'status' => $status,
            'reason' => $requestRow->ai_reason,
            'suggested_url' => $requestRow->ai_suggested_url,
            'request_id' => $requestRow->id,
            'edit_token' => $requestRow->edit_token,
        ]);
    }

    public function updateLink(Request $request, KioskServiceRequest $serviceRequest): JsonResponse
    {
        $validated = $request->validate([
            'edit_token' => 'required|string|max:64',
            'url' => 'required|string|max:500',
        ]);

        if (! hash_equals((string) $serviceRequest->edit_token, (string) $validated['edit_token'])) {
            return response()->json(['ok' => false, 'message' => 'Invalid token.'], 403);
        }

        if ($serviceRequest->status !== 'pending') {
            return response()->json(['ok' => false, 'message' => 'This request is already resolved.'], 422);
        }

        $serviceRequest->update(['url' => $this->normalizeUrl($validated['url'])]);

        $ai = $this->validator->validate($serviceRequest->toArray());
        $status = strtolower($ai['decision']);
        if (! in_array($status, ['approved', 'pending', 'rejected'], true)) {
            $status = 'pending';
        }

        $serviceRequest->update([
            'status' => $status,
            'ai_decision' => $status,
            'ai_reason' => $ai['reason'],
            'ai_suggested_url' => $ai['suggested_url'],
            'ai_tokens_used' => $serviceRequest->ai_tokens_used + (int) ($ai['tokens_used'] ?? 0),
            'resolved_at' => in_array($status, ['approved', 'rejected'], true) ? now() : null,
        ]);

        if ($status === 'approved') {
            $service = $this->createOrUpdateServiceFromRequest($serviceRequest);
            $serviceRequest->update([
                'approved_service_id' => $service->id,
                'approved_at' => now(),
            ]);
        }

        return response()->json([
            'ok' => true,
            'status' => $status,
            'reason' => $serviceRequest->ai_reason,
            'suggested_url' => $serviceRequest->ai_suggested_url,
            'request_id' => $serviceRequest->id,
            'edit_token' => $serviceRequest->edit_token,
        ]);
    }

    protected function createOrUpdateServiceFromRequest(KioskServiceRequest $request): KioskService
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

        $serviceSlugBase = Str::slug($request->category_slug . '--' . ($request->subcategory ?: $request->display_name));
        $serviceSlug = $serviceSlugBase;
        $n = 0;
        while (KioskService::where('service_slug', $serviceSlug)->where('id', '!=', $request->approved_service_id ?? 0)->exists()) {
            $n++;
            $serviceSlug = $serviceSlugBase . '-' . $n;
        }

        $categorySort = (int) (KioskCategory::where('slug', $request->category_slug)->value('sort_order') ?? 99);
        $maxItemSort = (int) KioskService::where('category_slug', $request->category_slug)->max('item_sort_within_category');

        $service = KioskService::updateOrCreate(
            ['id' => $request->approved_service_id],
            [
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
                'notes' => trim('User-requested service. ' . ($request->details ?? '')),
            ]
        );

        if (! empty($request->subcategory)) {
            KioskSubcategory::firstOrCreate(
                ['category_slug' => $request->category_slug, 'name' => $request->subcategory],
                ['sort_order' => ((int) KioskSubcategory::where('category_slug', $request->category_slug)->max('sort_order')) + 1]
            );
        }

        return $service;
    }

    protected function buildMarketCode(?string $state, ?string $city): string
    {
        $statePart = $state ? Str::upper(Str::slug($state, '-')) : 'UNKNOWN';
        $cityPart = $city ? Str::upper(Str::slug($city, '-')) : 'UNKNOWN';
        return "USER-{$statePart}-{$cityPart}";
    }

    protected function normalizeUrl(?string $url): ?string
    {
        if ($url === null || trim($url) === '') {
            return null;
        }
        $value = trim($url);
        if (! preg_match('/^https?:\/\//i', $value)) {
            $value = 'https://' . ltrim($value, '/');
        }
        return filter_var($value, FILTER_VALIDATE_URL) ? $value : null;
    }
}

