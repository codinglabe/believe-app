<?php

namespace App\Http\Controllers;

use App\Models\KioskServiceRequest;
use App\Services\KioskRequestApprovedServicePublisher;
use App\Services\KioskServiceRequestAiValidator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class KioskServiceRequestController extends Controller
{
    public function __construct(
        protected KioskServiceRequestAiValidator $validator,
        protected KioskRequestApprovedServicePublisher $publisher
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
            $service = $this->publisher->publish($requestRow->fresh());
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
            $service = $this->publisher->publish($serviceRequest->fresh());
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

