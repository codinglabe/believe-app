<?php

namespace App\Http\Controllers;

use App\Models\ContentItem;
use App\Models\ScheduledDrop;
use Illuminate\Http\Request;
use Inertia\Inertia;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $notifications = $request->user()
            ->notifications()
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($notifications);
    }

    public function markAsRead(Request $request, string $notificationId)
    {
        // Find the notification and verify it belongs to the current user
        $notification = $request->user()
            ->notifications()
            ->where('id', $notificationId)
            ->firstOrFail();

        // Mark as read if not already read
        if (!$notification->read_at) {
            $notification->markAsRead();
        }

        // Get the content item ID from notification data
        $contentItemId = $notification->data['content_item_id'] ?? null;

        if (!$contentItemId) {
            return response()->json(['error' => 'Content item not found in notification'], 404);
        }

        // Find the content item and verify user has access
        $contentItem = ContentItem::findOrFail($contentItemId);

        // Return JSON response with redirect URL for frontend
        return response()->json([
            'message' => 'Notification marked as read',
            'redirect_url' => route('notifications.content.show', $contentItem),
            'content_item_id' => $contentItemId
        ]);
    }

    public function markAllAsRead(Request $request)
    {
        $request->user()
            ->unreadNotifications()
            ->update(['read_at' => now()]);

        return response()->json(['message' => 'All notifications marked as read']);
    }

    public function clearAll(Request $request)
    {
        $request->user()
            ->notifications()
            ->delete();

        return response()->json(['message' => 'All notifications cleared']);
    }


    public function show(Request $request, ContentItem $contentItem)
    {
        // Verify user has access to this content item through campaign
        if (!$this->userHasAccessToContent($request->user(), $contentItem)) {
            abort(403, 'You do not have access to this content');
        }

        return Inertia::render('frontend/notification-content/show', [
            'contentItem' => $contentItem
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
}
