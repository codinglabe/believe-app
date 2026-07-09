<?php

namespace App\Http\Controllers;

use App\Models\ContentItem;
use App\Models\Organization;
use App\Models\ScheduledDrop;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class NotificationController extends Controller
{
    /**
     * JSON list for the header notification bell (axios).
     */
    public function apiIndex(Request $request)
    {
        $notifications = $request->user()
            ->notifications()
            ->orderBy('created_at', 'desc')
            ->get();

        $this->enrichNotificationsWithSender($notifications);

        return response()->json([
            'notifications' => $notifications,
        ]);
    }

    /**
     * Full-page notification inbox (Inertia).
     */
    public function inbox(Request $request): Response
    {
        $category = $this->normalizeCategory((string) $request->query('category', 'all'));
        $search = trim((string) $request->query('q', ''));
        $user = $request->user();
        $allRows = $user->notifications()->orderBy('created_at', 'desc')->get();
        $this->enrichNotificationsWithSender($allRows);

        $searchFiltered = $search === ''
            ? $allRows
            : $allRows->filter(function ($n) use ($search) {
                $payload = (array) $n->data;
                $blob = strtolower(trim(
                    (string) ($payload['type'] ?? '') . ' ' .
                    (string) ($payload['title'] ?? '') . ' ' .
                    (string) ($payload['body'] ?? '') . ' ' .
                    (string) ($payload['message'] ?? '') . ' ' .
                    (string) ($payload['organization_name'] ?? '') . ' ' .
                    (string) (($payload['meta']['organization_name'] ?? '') ?: '') . ' ' .
                    (string) (($payload['meta']['sender_name'] ?? '') ?: '')
                ));

                return str_contains($blob, strtolower($search));
            })->values();

        $counts = $this->buildCategoryCounts($searchFiltered);
        $filtered = $category === 'all'
            ? $searchFiltered
            : $searchFiltered->filter(fn ($n) => $this->categorizeNotificationPayload((array) $n->data) === $category)->values();

        $perPage = 5;
        $page = max(1, (int) $request->query('page', 1));
        $slice = $filtered->slice(($page - 1) * $perPage, $perPage)->values();
        $paginator = new LengthAwarePaginator(
            $slice,
            $filtered->count(),
            $perPage,
            $page,
            ['path' => $request->url(), 'query' => $request->query()]
        );

        return Inertia::render('Notifications/Inbox', [
            'notifications' => $paginator,
            'activeCategory' => $category,
            'filterCounts' => $counts,
            'searchQuery' => $search,
        ]);
    }

    public function markAsRead(Request $request, string $notificationId)
    {
        // Find the notification and verify it belongs to the current user
        $notification = $request->user()
            ->notifications()
            ->where('id', $notificationId)
            ->firstOrFail();

        // Mark as read if not already read
        if (! $notification->read_at) {
            $notification->markAsRead();
        }

        $contentItemId = $notification->data['content_item_id'] ?? null;

        if (! $contentItemId) {
            return response()->json([
                'success' => true,
                'message' => 'Notification marked as read',
                'redirect_url' => null,
                'content_item_id' => null,
            ]);
        }

        $contentItem = ContentItem::findOrFail($contentItemId);

        $redirectUrl = route('notifications.content.show', $contentItem);

        return response()->json([
            'success' => true,
            'message' => 'Notification marked as read',
            'redirect_url' => $redirectUrl,
            'content_item_id' => $contentItemId,
        ]);
    }

    public function markAllAsRead(Request $request)
    {
        $request->user()
            ->unreadNotifications()
            ->update(['read_at' => now()]);

        return response()->json([
            'success' => true,
            'message' => 'All notifications marked as read',
        ]);
    }

    public function clearAll(Request $request)
    {
        $request->user()
            ->notifications()
            ->delete();

        return response()->json([
            'success' => true,
            'message' => 'All notifications cleared',
        ]);
    }

    public function show(Request $request, ContentItem $contentItem)
    {
        // Verify user has access to this content item through campaign
        if (! $this->userHasAccessToContent($request->user(), $contentItem)) {
            abort(403, 'You do not have access to this content');
        }

        return Inertia::render('frontend/notification-content/show', [
            'contentItem' => $contentItem,
        ]);
    }

    /**
     * Check if user has access to the content item through campaign
     */
    private function userHasAccessToContent($user, ContentItem $contentItem): bool
    {
        // Method 1: Check through ScheduledDrops and SendJobs
        $hasAccess = ScheduledDrop::where('content_item_id', $contentItem->id)
            ->whereHas('campaign', function ($query) use ($user) {
                $query->whereHas('selectedUsers', function ($q) use ($user) {
                    $q->where('users.id', $user->id);
                });
            })
            ->whereHas('sendJobs', function ($query) use ($user) {
                $query->where('user_id', $user->id)
                    ->where('status', 'sent');
            })
            ->exists();

        if ($hasAccess) {
            return true;
        }

        return $hasAccess;
    }

    private function normalizeCategory(string $category): string
    {
        $allowed = ['all', 'ai', 'prayer', 'donations', 'events', 'messages', 'system'];
        return in_array($category, $allowed, true) ? $category : 'all';
    }

    /**
     * @param  Collection<int, mixed>  $notifications
     * @return array<string,int>
     */
    private function buildCategoryCounts(Collection $notifications): array
    {
        $counts = [
            'all' => $notifications->count(),
            'ai' => 0,
            'prayer' => 0,
            'donations' => 0,
            'events' => 0,
            'messages' => 0,
            'system' => 0,
        ];

        foreach ($notifications as $row) {
            $category = $this->categorizeNotificationPayload((array) $row->data);
            if (isset($counts[$category])) {
                $counts[$category]++;
            }
        }

        return $counts;
    }

    private function categorizeNotificationPayload(array $payload): string
    {
        $blob = strtolower(trim(
            (string) ($payload['type'] ?? '') . ' ' .
            (string) ($payload['title'] ?? '') . ' ' .
            (string) ($payload['body'] ?? '') . ' ' .
            (string) ($payload['message'] ?? '')
        ));

        if (str_contains($blob, 'ai') || str_contains($blob, 'assistant')) {
            return 'ai';
        }
        if (str_contains($blob, 'pray') || str_contains($blob, 'worship') || str_contains($blob, 'devotional') || str_contains($blob, 'scripture')) {
            return 'prayer';
        }
        if (str_contains($blob, 'donat') || str_contains($blob, 'gift') || str_contains($blob, 'fund')) {
            return 'donations';
        }
        if (str_contains($blob, 'event') || str_contains($blob, 'live') || str_contains($blob, 'meeting') || str_contains($blob, 'course') || str_contains($blob, 'job')) {
            return 'events';
        }
        if (str_contains($blob, 'message') || str_contains($blob, 'comment') || str_contains($blob, 'chat')) {
            return 'messages';
        }

        return 'system';
    }

    /**
     * Attach organization_name / creator_name onto notification payloads
     * so the bell/inbox can show "Sent by …" for older rows that lack it.
     *
     * @param  Collection<int, DatabaseNotification>  $notifications
     */
    private function enrichNotificationsWithSender(Collection $notifications): void
    {
        if ($notifications->isEmpty()) {
            return;
        }

        $orgIds = [];
        $userIds = [];
        $contentItemIds = [];

        foreach ($notifications as $notification) {
            $payload = (array) $notification->data;
            $meta = is_array($payload['meta'] ?? null) ? $payload['meta'] : [];
            $type = strtolower((string) ($payload['type'] ?? $notification->type ?? ''));

            foreach ([$payload['organization_id'] ?? null, $meta['organization_id'] ?? null] as $orgId) {
                if ($orgId) {
                    $orgIds[] = (int) $orgId;
                }
            }

            foreach ([$payload['created_by'] ?? null, $meta['created_by'] ?? null, $payload['user_id'] ?? null] as $userId) {
                if ($userId) {
                    $userIds[] = (int) $userId;
                }
            }

            $hasSenderName = filled($payload['organization_name'] ?? null)
                || filled($meta['organization_name'] ?? null)
                || filled($meta['sender_name'] ?? null)
                || filled($payload['host_name'] ?? null)
                || filled($payload['inviter_label'] ?? null)
                || filled($meta['donor_name'] ?? null)
                || filled($payload['creator_name'] ?? null)
                || filled($meta['creator_name'] ?? null);

            if (! $hasSenderName && $this->payloadLooksLikeContentDrop($type, $payload, (string) $notification->type)
                && ! empty($payload['content_item_id'])) {
                $contentItemIds[] = (int) $payload['content_item_id'];
            }
        }

        $contentItemIds = array_values(array_unique($contentItemIds));
        $contentById = collect();
        $campaignOrgByContentId = [];
        $campaignUserByContentId = [];

        if ($contentItemIds !== []) {
            $contentById = ContentItem::query()
                ->whereIn('id', $contentItemIds)
                ->get(['id', 'organization_id', 'user_id'])
                ->keyBy('id');

            foreach ($contentById as $item) {
                if ($item->organization_id) {
                    $orgIds[] = (int) $item->organization_id;
                }
                if ($item->user_id) {
                    $userIds[] = (int) $item->user_id;
                }
            }

            $drops = ScheduledDrop::query()
                ->with(['campaign:id,organization_id,user_id'])
                ->whereIn('content_item_id', $contentItemIds)
                ->orderByDesc('id')
                ->get(['id', 'content_item_id', 'campaign_id']);

            foreach ($drops as $drop) {
                $contentId = (int) $drop->content_item_id;
                if (isset($campaignOrgByContentId[$contentId])) {
                    continue;
                }
                if ($drop->campaign?->organization_id) {
                    $campaignOrgByContentId[$contentId] = (int) $drop->campaign->organization_id;
                    $orgIds[] = (int) $drop->campaign->organization_id;
                }
                if ($drop->campaign?->user_id) {
                    $campaignUserByContentId[$contentId] = (int) $drop->campaign->user_id;
                    $userIds[] = (int) $drop->campaign->user_id;
                }
            }
        }

        $orgNamesById = $orgIds === []
            ? []
            : Organization::query()
                ->whereIn('id', array_values(array_unique($orgIds)))
                ->pluck('name', 'id')
                ->all();

        $userNamesById = $userIds === []
            ? []
            : User::query()
                ->whereIn('id', array_values(array_unique($userIds)))
                ->pluck('name', 'id')
                ->all();

        foreach ($notifications as $notification) {
            $payload = (array) $notification->data;
            $meta = is_array($payload['meta'] ?? null) ? $payload['meta'] : [];
            $type = strtolower((string) ($payload['type'] ?? $notification->type ?? ''));
            $isContentDrop = $this->payloadLooksLikeContentDrop($type, $payload, (string) $notification->type);

            $orgId = isset($payload['organization_id'])
                ? (int) $payload['organization_id']
                : (isset($meta['organization_id']) ? (int) $meta['organization_id'] : null);

            $creatorId = isset($payload['created_by'])
                ? (int) $payload['created_by']
                : (isset($meta['created_by']) ? (int) $meta['created_by'] : null);

            $contentItemId = ! empty($payload['content_item_id']) ? (int) $payload['content_item_id'] : null;
            $contentItem = ($isContentDrop && $contentItemId && isset($contentById[$contentItemId]))
                ? $contentById[$contentItemId]
                : null;

            if (! $orgId && $contentItem?->organization_id) {
                $orgId = (int) $contentItem->organization_id;
            }
            if (! $orgId && $contentItemId && isset($campaignOrgByContentId[$contentItemId])) {
                $orgId = $campaignOrgByContentId[$contentItemId];
            }

            if (! $creatorId && $contentItem?->user_id) {
                $creatorId = (int) $contentItem->user_id;
            }
            if (! $creatorId && $contentItemId && isset($campaignUserByContentId[$contentItemId])) {
                $creatorId = $campaignUserByContentId[$contentItemId];
            }

            $orgName = $this->trimName($payload['organization_name'] ?? $meta['organization_name'] ?? null)
                ?? ($orgId && isset($orgNamesById[$orgId]) ? $this->trimName($orgNamesById[$orgId]) : null);

            $creatorName = $this->trimName($payload['creator_name'] ?? $meta['creator_name'] ?? null)
                ?? ($creatorId && isset($userNamesById[$creatorId]) ? $this->trimName($userNamesById[$creatorId]) : null);

            if ($orgId) {
                $payload['organization_id'] = $orgId;
                $meta['organization_id'] = $orgId;
            }
            if ($orgName) {
                $payload['organization_name'] = $orgName;
                $meta['organization_name'] = $orgName;
            }
            if ($creatorId) {
                $payload['created_by'] = $creatorId;
                $meta['created_by'] = $creatorId;
            }
            if ($creatorName) {
                $payload['creator_name'] = $creatorName;
                $meta['creator_name'] = $creatorName;
            }

            $payload['meta'] = $meta;
            $notification->setAttribute('data', $payload);
        }
    }

    private function trimName(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }
        $trimmed = trim($value);

        return $trimmed !== '' ? $trimmed : null;
    }

    /**
     * True when content_item_id refers to a ContentItem (campaign prayer/devotional),
     * not a course/event/job id that reuses the same field name.
     */
    private function payloadLooksLikeContentDrop(string $type, array $payload, string $notificationClass = ''): bool
    {
        $class = strtolower($notificationClass);
        if (
            str_contains($type, 'dailyprayer')
            || str_contains($class, 'dailyprayer')
            || in_array($type, ['prayer', 'devotional', 'scripture', 'campaign'], true)
        ) {
            return true;
        }

        // Course/job/event jobs put their own ids in content_item_id — skip those.
        if (
            isset($payload['course_id'])
            || isset($payload['event_id'])
            || isset($payload['job_post_id'])
            || str_contains($type, 'course')
            || str_contains($type, 'event')
            || str_contains($type, 'job')
            || str_contains($type, 'gift')
            || str_contains($type, 'donation')
            || str_contains($type, 'birthday')
            || str_contains($type, 'invitation')
            || str_contains($type, 'participation')
        ) {
            return false;
        }

        return ! empty($payload['content_item_id'])
            && empty($payload['course_id'])
            && empty($payload['event_id']);
    }
}
