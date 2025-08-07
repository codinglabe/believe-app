<?php

use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Here you may register all of the event broadcasting channels that your
| application supports. The given channel authorization callbacks are
| used to check if an authenticated user can listen to the channel.
|
*/

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// This line is crucial for the /broadcasting/auth endpoint
Broadcast::routes();

// Define your chat channels
Broadcast::channel('chat.{roomId}', function ($user, $roomId) {
    $chatRoom = \App\Models\ChatRoom::find($roomId);
    return $chatRoom && $chatRoom->members->contains($user);
});

Broadcast::channel('presence-chat-room.{roomId}', function ($user, $roomId) {
    $chatRoom = \App\Models\ChatRoom::find($roomId);
    if ($chatRoom && $chatRoom->members->contains($user)) {
        return ['id' => $user->id, 'name' => $user->name, 'avatar' => $user->avatar_url, 'is_online' => $user->is_online, 'role' => $user->role, 'organization' => $user->organization ? ['id' => $user->organization->id, 'name' => $user->organization->name] : null];
    }
    return false;
});

// Channel for new room creation notifications (private to each user)
Broadcast::channel('users.{userId}', function ($user, $userId) {
    return (int) $user->id === (int) $userId;
});

// Public channel for new public room creations (no auth needed)
Broadcast::channel('chat-rooms', function ($user) {
    return true; // Anyone can listen to this public channel
});
