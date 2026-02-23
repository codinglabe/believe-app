<?php

namespace App\Http\Controllers;

use App\Models\OrganizationLivestream;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class UnityLiveController extends Controller
{
    /**
     * Map a livestream to the public array shape (slug, title, viewUrl, etc.).
     *
     * @return array<string, mixed>|null
     */
    private function toLivestreamItem(OrganizationLivestream $ls): ?array
    {
        $viewUrl = $ls->getPublicViewUrl();
        if (! $viewUrl) {
            return null;
        }
        return [
            'id' => $ls->id,
            'slug' => $ls->room_name,
            'title' => $ls->title ?: 'Live Stream',
            'organizationName' => $ls->organization?->name ?? 'Organization',
            'viewUrl' => $viewUrl,
            'viewUrlFallback' => $ls->getPublicViewUrlFallback(),
            'startedAt' => $ls->started_at?->toIso8601String(),
        ];
    }

    /**
     * Public Unity Live index: list all organizations' livestreams that are currently live.
     * Clicking a card goes to the show page (slug-wise) for the big screen.
     */
    public function index(): Response
    {
        $livestreams = OrganizationLivestream::query()
            ->where('status', 'live')
            ->where('is_public', true)
            ->with('organization:id,name')
            ->orderByDesc('started_at')
            ->get()
            ->map(fn (OrganizationLivestream $ls) => $this->toLivestreamItem($ls))
            ->filter()
            ->values()
            ->all();

        return Inertia::render('frontend/unity-live/Index', [
            'seo' => [
                'title' => 'Unity Live',
                'description' => 'Watch live streams from organizations on Believe.',
            ],
            'livestreams' => $livestreams,
        ]);
    }

    /**
     * Public Unity Live show: one stream in big screen by slug (room_name).
     * 404 if slug not found or stream not live.
     */
    public function show(Request $request, string $slug): Response
    {
        // Allow both public and private: private streams only viewable via direct link (director shares link)
        $livestream = OrganizationLivestream::query()
            ->where('room_name', $slug)
            ->where('status', 'live')
            ->with('organization:id,name')
            ->firstOrFail();

        $item = $this->toLivestreamItem($livestream);
        if (! $item) {
            abort(404);
        }

        $otherLivestreams = OrganizationLivestream::query()
            ->where('status', 'live')
            ->where('is_public', true)
            ->where('id', '!=', $livestream->id)
            ->with('organization:id,name')
            ->orderByDesc('started_at')
            ->get()
            ->map(fn (OrganizationLivestream $ls) => $this->toLivestreamItem($ls))
            ->filter()
            ->values()
            ->all();

        return Inertia::render('frontend/unity-live/Show', [
            'seo' => [
                'title' => $item['title'] . ' | Unity Live',
                'description' => 'Watch ' . $item['title'] . ' live from ' . $item['organizationName'],
            ],
            'livestream' => $item,
            'otherLivestreams' => $otherLivestreams,
        ]);
    }
}
