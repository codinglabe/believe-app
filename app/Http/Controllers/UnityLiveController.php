<?php

namespace App\Http\Controllers;

use App\Models\OrganizationLivestream;
use App\Models\UserLivestream;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class UnityLiveController extends Controller
{
    /**
     * Map an org livestream to the public array shape (slug, title, viewUrl, etc.).
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
            'id' => 'org_' . $ls->id,
            'slug' => $ls->room_name,
            'title' => $ls->title ?: 'Live Stream',
            'organizationName' => $ls->organization?->name ?? 'Organization',
            'viewUrl' => $viewUrl,
            'viewUrlMuted' => $ls->getPublicViewUrlMuted(),
            'viewUrlFallback' => $ls->getPublicViewUrlFallback(),
            'startedAt' => $ls->started_at?->toIso8601String(),
        ];
    }

    /**
     * Map a supporter (user) livestream to the same public array shape.
     *
     * @return array<string, mixed>|null
     */
    private function toUserLivestreamItem(UserLivestream $ls): ?array
    {
        $viewUrl = $ls->getPublicViewUrl();
        if (! $viewUrl) {
            return null;
        }
        return [
            'id' => 'user_' . $ls->id,
            'slug' => $ls->room_name,
            'title' => $ls->title ?: 'Live Stream',
            'organizationName' => $ls->user?->name ?? 'Host',
            'viewUrl' => $viewUrl,
            'viewUrlMuted' => $ls->getPublicViewUrlMuted(),
            'viewUrlFallback' => $ls->getPublicViewUrlFallback(),
            'startedAt' => $ls->started_at?->toIso8601String(),
        ];
    }

    /**
     * Public Unity Live index: list org + supporter livestreams that are currently live (and public).
     * Clicking a card goes to the show page (slug-wise) for the big screen.
     */
    public function index(): Response
    {
        $orgStreams = OrganizationLivestream::query()
            ->where('status', 'live')
            ->where('is_public', true)
            ->with('organization:id,name')
            ->orderByDesc('started_at')
            ->get()
            ->map(fn (OrganizationLivestream $ls) => $this->toLivestreamItem($ls))
            ->filter()
            ->values()
            ->all();

        $userStreams = UserLivestream::query()
            ->where('status', 'live')
            ->where('is_public', true)
            ->with('user:id,name')
            ->orderByDesc('started_at')
            ->get()
            ->map(fn (UserLivestream $ls) => $this->toUserLivestreamItem($ls))
            ->filter()
            ->values()
            ->all();

        $livestreams = collect(array_merge($orgStreams, $userStreams))
            ->sortByDesc(fn ($s) => $s['startedAt'] ?? '')
            ->values()
            ->all();

        return Inertia::render('frontend/unity-live/Index', [
            'seo' => [
                'title' => 'Unity Live & Meet',
                'description' => 'Watch live streams and host meetings with your organization on Believe.',
            ],
            'livestreams' => $livestreams,
            'upcomingMeetings' => [],
        ]);
    }

    /**
     * Public Unity Live show: one stream in big screen by slug (room_name).
     * Resolves org livestream first, then supporter livestream. 404 if not found or not live.
     */
    public function show(Request $request, string $slug): Response
    {
        $livestream = OrganizationLivestream::query()
            ->where('room_name', $slug)
            ->where('status', 'live')
            ->with('organization:id,name')
            ->first();

        if ($livestream) {
            $item = $this->toLivestreamItem($livestream);
            if (! $item) {
                abort(404);
            }
            $otherLivestreams = $this->getOtherLivestreams($item['id'], $slug);
            return Inertia::render('frontend/unity-live/Show', [
                'seo' => [
                    'title' => $item['title'] . ' | Unity Live',
                    'description' => 'Watch ' . $item['title'] . ' live from ' . $item['organizationName'],
                ],
                'livestream' => $item,
                'otherLivestreams' => $otherLivestreams,
            ]);
        }

        $userStream = UserLivestream::query()
            ->where('room_name', $slug)
            ->where('status', 'live')
            ->with('user:id,name')
            ->first();

        if ($userStream) {
            $item = $this->toUserLivestreamItem($userStream);
            if (! $item) {
                abort(404);
            }
            $otherLivestreams = $this->getOtherLivestreams($item['id'], $slug);
            return Inertia::render('frontend/unity-live/Show', [
                'seo' => [
                    'title' => $item['title'] . ' | Unity Live',
                    'description' => 'Watch ' . $item['title'] . ' live from ' . $item['organizationName'],
                ],
                'livestream' => $item,
                'otherLivestreams' => $otherLivestreams,
            ]);
        }

        abort(404, 'Stream not found.');
    }

    /**
     * Other live streams (org + user, public, excluding current) for sidebar.
     *
     * @return array<int, array<string, mixed>>
     */
    private function getOtherLivestreams(string $currentId, string $currentSlug): array
    {
        $org = OrganizationLivestream::query()
            ->where('status', 'live')
            ->where('is_public', true)
            ->where('room_name', '!=', $currentSlug)
            ->with('organization:id,name')
            ->orderByDesc('started_at')
            ->get()
            ->map(fn (OrganizationLivestream $ls) => $this->toLivestreamItem($ls))
            ->filter()
            ->values()
            ->all();

        $user = UserLivestream::query()
            ->where('status', 'live')
            ->where('is_public', true)
            ->where('room_name', '!=', $currentSlug)
            ->with('user:id,name')
            ->orderByDesc('started_at')
            ->get()
            ->map(fn (UserLivestream $ls) => $this->toUserLivestreamItem($ls))
            ->filter()
            ->values()
            ->all();

        return collect(array_merge($org, $user))
            ->filter(fn ($s) => $s['id'] !== $currentId)
            ->sortByDesc(fn ($s) => $s['startedAt'] ?? '')
            ->values()
            ->all();
    }
}
