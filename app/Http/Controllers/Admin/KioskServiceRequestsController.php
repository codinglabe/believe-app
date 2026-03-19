<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\KioskCategory;
use App\Models\KioskServiceRequest;
use App\Services\KioskRequestApprovedServicePublisher;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class KioskServiceRequestsController extends Controller
{
    public function __construct(
        protected KioskRequestApprovedServicePublisher $publisher
    ) {
        $this->middleware(['auth', 'EnsureEmailIsVerified', 'role:admin']);
    }

    public function index(Request $request): Response
    {
        $query = KioskServiceRequest::query();

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        if ($request->filled('search')) {
            $term = trim($request->string('search')->toString());
            $query->where(function ($q) use ($term) {
                $q->where('display_name', 'like', '%'.$term.'%')
                    ->orWhere('requester_name', 'like', '%'.$term.'%')
                    ->orWhere('requester_email', 'like', '%'.$term.'%')
                    ->orWhere('category_slug', 'like', '%'.$term.'%')
                    ->orWhere('subcategory', 'like', '%'.$term.'%')
                    ->orWhere('url', 'like', '%'.$term.'%')
                    ->orWhere('ai_reason', 'like', '%'.$term.'%');
            });
        }

        $requests = $query->latest('id')
            ->paginate(15)
            ->withQueryString()
            ->through(fn ($row) => [
                'id' => $row->id,
                'requester_name' => $row->requester_name,
                'requester_email' => $row->requester_email,
                'display_name' => $row->display_name,
                'category_slug' => $row->category_slug,
                'subcategory' => $row->subcategory,
                'state' => $row->state,
                'city' => $row->city,
                'url' => $row->url,
                'status' => $row->status,
                'ai_decision' => $row->ai_decision,
                'ai_reason' => $row->ai_reason,
                'ai_suggested_url' => $row->ai_suggested_url,
                'approved_service_id' => $row->approved_service_id,
                'created_at' => optional($row->created_at)->toDateTimeString(),
            ]);

        return Inertia::render('admin/kiosk-requests/index', [
            'requests' => $requests,
            'filters' => [
                'search' => $request->query('search'),
                'status' => $request->query('status'),
            ],
        ]);
    }

    public function edit(int $id): Response
    {
        $kioskServiceRequest = KioskServiceRequest::findOrFail($id);

        $categories = KioskCategory::orderBy('sort_order')->get(['slug', 'title'])->map(fn ($c) => [
            'value' => $c->slug,
            'label' => $c->title,
        ])->all();

        return Inertia::render('admin/kiosk-requests/edit', [
            'requestRecord' => $this->requestRecordPayload($kioskServiceRequest),
            'categories' => $categories,
        ]);
    }

    public function show(int $id): Response
    {
        $kioskServiceRequest = KioskServiceRequest::findOrFail($id);
        $categoryTitle = KioskCategory::where('slug', $kioskServiceRequest->category_slug)->value('title');

        return Inertia::render('admin/kiosk-requests/show', [
            'requestRecord' => array_merge($this->requestRecordPayload($kioskServiceRequest), [
                'category_title' => $categoryTitle ?? $kioskServiceRequest->category_slug,
                'updated_at' => optional($kioskServiceRequest->updated_at)->toDateTimeString(),
                'approved_at' => optional($kioskServiceRequest->approved_at)->toDateTimeString(),
                'resolved_at' => optional($kioskServiceRequest->resolved_at)->toDateTimeString(),
                'ai_tokens_used' => (int) $kioskServiceRequest->ai_tokens_used,
            ]),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    protected function requestRecordPayload(KioskServiceRequest $r): array
    {
        return [
            'id' => $r->id,
            'requester_name' => $r->requester_name,
            'requester_email' => $r->requester_email,
            'display_name' => $r->display_name,
            'category_slug' => $r->category_slug,
            'subcategory' => $r->subcategory ?? '',
            'state' => $r->state ?? '',
            'city' => $r->city ?? '',
            'url' => $r->url ?? '',
            'details' => $r->details ?? '',
            'status' => $r->status,
            'ai_decision' => $r->ai_decision,
            'ai_reason' => $r->ai_reason ?? '',
            'ai_suggested_url' => $r->ai_suggested_url,
            'approved_service_id' => $r->approved_service_id,
            'market_code' => $r->market_code,
            'created_at' => optional($r->created_at)->toDateTimeString(),
        ];
    }

    public function update(Request $request, int $id): RedirectResponse
    {
        $kioskServiceRequest = KioskServiceRequest::findOrFail($id);

        $validated = $request->validate([
            'display_name' => 'required|string|max:255',
            'category_slug' => 'required|string|max:64|exists:kiosk_categories,slug',
            'subcategory' => 'nullable|string|max:128',
            'state' => 'nullable|string|max:64',
            'city' => 'nullable|string|max:128',
            'url' => 'nullable|string|max:500',
            'details' => 'nullable|string|max:2000',
            'status' => 'required|string|in:approved,pending,rejected',
            'ai_reason' => 'nullable|string|max:2000',
        ]);

        $validated['url'] = $this->normalizeUrl($validated['url'] ?? null);
        $validated['subcategory'] = $validated['subcategory'] !== '' ? $validated['subcategory'] : null;
        $validated['market_code'] = $this->buildMarketCode(
            $validated['state'] ?? null,
            $validated['city'] ?? null
        );

        $kioskServiceRequest->fill([
            'display_name' => $validated['display_name'],
            'category_slug' => $validated['category_slug'],
            'subcategory' => $validated['subcategory'],
            'state' => $validated['state'],
            'city' => $validated['city'],
            'url' => $validated['url'],
            'details' => $validated['details'],
            'status' => $validated['status'],
            'ai_decision' => $validated['status'],
            'ai_reason' => $validated['ai_reason'],
            'market_code' => $validated['market_code'],
        ]);
        $kioskServiceRequest->save();

        $this->syncPublishingForRequest($kioskServiceRequest->fresh());

        return redirect()->route('admin.kiosk.requests.show', $id)->with('success', 'Request updated.');
    }

    public function updateStatus(Request $request, int $id): RedirectResponse
    {
        $kioskServiceRequest = KioskServiceRequest::findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|string|in:approved,pending,rejected',
        ]);

        $kioskServiceRequest->update([
            'status' => $validated['status'],
            'ai_decision' => $validated['status'],
        ]);

        $this->syncPublishingForRequest($kioskServiceRequest->fresh());

        return redirect()->back()->with('success', 'Status updated.');
    }

    public function destroy(int $id): RedirectResponse
    {
        $kioskServiceRequest = KioskServiceRequest::findOrFail($id);
        $kioskServiceRequest->delete();

        return redirect()->route('admin.kiosk.requests.index')->with('success', 'Request deleted.');
    }

    protected function syncPublishingForRequest(KioskServiceRequest $row): void
    {
        if ($row->status === 'approved') {
            $service = $this->publisher->publish($row);
            $row->update([
                'approved_service_id' => $service->id,
                'approved_at' => now(),
                'resolved_at' => now(),
            ]);
        } else {
            $this->publisher->unpublishLinkedService($row->approved_service_id);
            $row->update([
                'approved_at' => null,
                'resolved_at' => $row->status === 'rejected' ? now() : null,
            ]);
        }
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
            $value = 'https://'.ltrim($value, '/');
        }

        return filter_var($value, FILTER_VALIDATE_URL) ? $value : null;
    }
}
