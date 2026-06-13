<?php

use App\Models\User;
use App\Services\UnityCallService;
use Illuminate\Support\Facades\Broadcast;

// Channel authorization only — routes registered in BroadcastServiceProvider.
Broadcast::channel('public-chat.{roomId}', function (User $user, $roomId) {
    return app(UnityCallService::class)->userCanListenOnChatRoom($user, (int) $roomId, 'public');
});

Broadcast::channel('private-chat.{roomId}', function (User $user, $roomId) {
    return app(UnityCallService::class)->userCanListenOnChatRoom($user, (int) $roomId, 'private');
});

Broadcast::channel('direct-chat.{roomId}', function (User $user, $roomId) {
    return app(UnityCallService::class)->userCanListenOnChatRoom($user, (int) $roomId, 'direct');
});

Broadcast::channel('typing.{roomId}', function (User $user, $roomId) {
    return app(UnityCallService::class)->userCanListenOnChatRoom($user, (int) $roomId);
});

Broadcast::channel('presence-chat.{roomId}', function (User $user, $roomId) {
    if (! app(UnityCallService::class)->userCanListenOnChatRoom($user, (int) $roomId)) {
        return false;
    }

    return [
        'id' => $user->id,
        'name' => $user->name,
        'avatar' => $user->avatar_url,
        'is_online' => $user->is_online,
    ];
});

Broadcast::channel('user.{id}', function (User $user, $userId) {
    return (int) $user->id === (int) $userId;
});

Broadcast::channel('unity-call.{callId}', function (User $user, $callId) {
    return app(UnityCallService::class)->userCanBroadcastOnCall($user, (int) $callId);
});

Broadcast::channel('meeting.{meetingId}.participants', function (User $user, $meetingId) {
    return $user->meetings()->where('meetings.id', $meetingId)->exists();
});

Broadcast::channel('meeting.{meetingId}', function ($user, $meetingId) {
    return true; // Allow all users for testing (no DB auth check)
});
