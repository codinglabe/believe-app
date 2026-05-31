<?php

namespace App\Http\Controllers;

use App\Models\OrganizationLivestream;
use App\Models\UserLivestream;
use App\Support\UnityLiveBroadcast;
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
            'hostType' => 'organization',
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
            'hostType' => 'supporter',
            'viewUrl' => $viewUrl,
            'viewUrlMuted' => $ls->getPublicViewUrlMuted(),
            'viewUrlFallback' => $ls->getPublicViewUrlFallback(),
            'startedAt' => $ls->started_at?->toIso8601String(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function toPreviewItem(OrganizationLivestream|UserLivestream $ls): array
    {
        $organizationName = $ls instanceof OrganizationLivestream
            ? ($ls->organization?->name ?? 'Organization')
            : ($ls->user?->name ?? 'Host');

        return [
            'slug' => $ls->room_name,
            'title' => $ls->title ?: 'Live Stream',
            'organizationName' => $organizationName,
            'status' => (string) $ls->status,
            'isPublic' => (bool) $ls->is_public,
            'scheduledAt' => $ls->scheduled_at?->toIso8601String(),
        ];
    }

    /**
     * @return array{0: string, 1: string|null}
     */
    private function offlineCopy(OrganizationLivestream|UserLivestream $ls): array
    {
        $status = (string) $ls->status;

        if ($status === 'live' && ! $ls->is_public) {
            return [
                'This meeting is not on Unity Live',
                'The host has not enabled “Show on Unity Live” for this meeting.',
            ];
        }

        if ($status === 'meeting_live') {
            return [
                'Meeting in progress — not on Unity Live yet',
                'The host is in the meeting. This page will work once they click Go Unity Live.',
            ];
        }

        if ($status === 'scheduled') {
            return [
                'Scheduled — not live yet',
                'Come back when the host starts the meeting and goes live on Unity Live.',
            ];
        }

        if ($status === 'ended') {
            return [
                'This stream has ended',
                'Watch for a new live session from this host on Unity Live.',
            ];
        }

        if ($status === 'cancelled') {
            return [
                'This meeting was cancelled',
                null,
            ];
        }

        return [
            'Not live yet',
            'Check back soon. When the host goes live on Unity Live, the stream will appear here automatically.',
        ];
    }

    private function isWatchableOnUnityLive(OrganizationLivestream|UserLivestream $ls): bool
    {
        return $ls->status === 'live' && (bool) $ls->is_public;
    }

    /**
     * Public Unity Live index: live streams anyone can watch (frontend site).
     * Dashboard users can still open Unity Live → Live from the dashboard sidebar separately.
     */
    public function index(Request $request): Response
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

        $upcomingMeetings = $this->buildUpcomingPublicMeetings();

        return Inertia::render('frontend/unity-live/Index', [
            'seo' => [
                'title' => 'Unity Live',
                'description' => 'Watch live streams from organizations and hosts on Believe In Unity.',
            ],
            'livestreams' => $livestreams,
            'upcomingMeetings' => $upcomingMeetings,
        ]);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function buildUpcomingPublicMeetings(): array
    {
        $org = OrganizationLivestream::query()
            ->where('status', 'scheduled')
            ->where('is_public', true)
            ->whereNotNull('scheduled_at')
            ->where('scheduled_at', '>=', now())
            ->with('organization:id,name')
            ->orderBy('scheduled_at')
            ->limit(8)
            ->get()
            ->map(fn (OrganizationLivestream $ls) => [
                'id' => 'org_' . $ls->id,
                'slug' => $ls->room_name,
                'title' => $ls->title ?: 'Scheduled meeting',
                'hostName' => $ls->organization?->name ?? 'Organization',
                'hostType' => 'organization',
                'scheduledAt' => $ls->scheduled_at?->toIso8601String(),
                'viewUrl' => url('/unity-live/' . $ls->room_name),
            ])
            ->all();

        $user = UserLivestream::query()
            ->where('status', 'scheduled')
            ->where('is_public', true)
            ->whereNotNull('scheduled_at')
            ->where('scheduled_at', '>=', now())
            ->with('user:id,name')
            ->orderBy('scheduled_at')
            ->limit(8)
            ->get()
            ->map(fn (UserLivestream $ls) => [
                'id' => 'user_' . $ls->id,
                'slug' => $ls->room_name,
                'title' => $ls->title ?: 'Scheduled meeting',
                'hostName' => $ls->user?->name ?? 'Host',
                'hostType' => 'supporter',
                'scheduledAt' => $ls->scheduled_at?->toIso8601String(),
                'viewUrl' => url('/unity-live/' . $ls->room_name),
            ])
            ->all();

        return collect(array_merge($org, $user))
            ->sortBy(fn ($m) => $m['scheduledAt'] ?? '')
            ->take(8)
            ->values()
            ->all();
    }

    /**
     * Public Unity Live show: live player, or a friendly offline message when not live yet.
     */
    public function show(Request $request, string $slug): Response
    {
        $orgStream = OrganizationLivestream::query()
            ->where('room_name', $slug)
            ->with('organization:id,name')
            ->orderByDesc('id')
            ->first();

        if ($orgStream) {
            return $this->renderUnityLiveShowPage($orgStream, 'org_' . $orgStream->id);
        }

        $userStream = $this->resolveUserStreamBySlug($slug);

        if ($userStream) {
            return $this->renderUnityLiveShowPage($userStream, 'user_' . $userStream->id);
        }

        abort(404, 'Stream not found.');
    }

    /**
     * @return Response
     */
    private function renderUnityLiveShowPage(
        OrganizationLivestream|UserLivestream $livestream,
        string $streamId,
    ): Response {
        $preview = $this->toPreviewItem($livestream);
        $otherLivestreams = $this->getOtherLivestreams(
            $streamId,
            (string) $livestream->room_name,
        );

        if ($this->isWatchableOnUnityLive($livestream)) {
            $item = $livestream instanceof OrganizationLivestream
                ? $this->toLivestreamItem($livestream)
                : $this->toUserLivestreamItem($livestream);

            if (! $item) {
                abort(404);
            }

            return Inertia::render('frontend/unity-live/Show', [
                'seo' => [
                    'title' => $item['title'] . ' | Unity Live',
                    'description' => 'Watch ' . $item['title'] . ' live from ' . $item['organizationName'],
                ],
                'livestream' => $item,
                'otherLivestreams' => $otherLivestreams,
                'broadcastChannel' => UnityLiveBroadcast::channelName($livestream),
            ]);
        }

        [$message, $hint] = $this->offlineCopy($livestream);

        return Inertia::render('frontend/unity-live/Offline', [
            'seo' => [
                'title' => $preview['title'] . ' | Unity Live',
                'description' => $message,
            ],
            'preview' => $preview,
            'message' => $message,
            'hint' => $hint,
            'otherLivestreams' => $otherLivestreams,
            'broadcastChannel' => UnityLiveBroadcast::channelName($livestream),
        ]);
    }

    /**
     * Resolve supporter meeting by room_name or legacy profile id (uni-{slug}-{userId}).
     */
    private function resolveUserStreamBySlug(string $slug): ?UserLivestream
    {
        $base = UserLivestream::query()->with('user:id,name');

        $direct = (clone $base)->where('room_name', $slug)->orderByDesc('id')->first();
        if ($direct) {
            return $direct;
        }

        if (preg_match('/^uni-.+-(\d+)$/', $slug, $matches) !== 1) {
            return null;
        }

        $userId = (int) ($matches[1] ?? 0);
        if ($userId < 1) {
            return null;
        }

        return (clone $base)
            ->where('user_id', $userId)
            ->orderByDesc('updated_at')
            ->first();
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
