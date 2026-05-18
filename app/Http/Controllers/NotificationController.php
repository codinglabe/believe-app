<?php

namespace App\Http\Controllers;

use App\Models\ContentItem;
use App\Models\ScheduledDrop;
use Illuminate\Http\Request;
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

        $searchFiltered = $search === ''
            ? $allRows
            : $allRows->filter(function ($n) use ($search) {
                $payload = (array) $n->data;
                $blob = strtolower(trim(
                    (string) ($payload['type'] ?? '') . ' ' .
                    (string) ($payload['title'] ?? '') . ' ' .
                    (string) ($payload['body'] ?? '') . ' ' .
                    (string) ($payload['message'] ?? '')
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
}
