<?php

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::routes(['middleware' => ['auth']]);

// Public chat channels
Broadcast::channel('public-chat.{roomId}', function (User $user, $roomId) {
    return $user->chatRooms()->where('chat_rooms.id', $roomId)->exists();
});

// Private chat channels
Broadcast::channel('private-chat.{roomId}', function (User $user, $roomId) {
    return $user->chatRooms()
        ->where('chat_rooms.id', $roomId)
        ->where('chat_rooms.type', 'private')
        ->exists();
});

// Direct chat channels
Broadcast::channel('direct-chat.{roomId}', function (User $user, $roomId) {
    return $user->chatRooms()
        ->where('chat_rooms.id', $roomId)
        ->where('chat_rooms.type', 'direct')
        ->exists();
});

// Typing indicator channels
Broadcast::channel('typing.{roomId}', function (User $user, $roomId) {
    return $user->chatRooms()->where('chat_rooms.id', $roomId)->exists();
});

// User presence channels
Broadcast::channel('presence-chat.{roomId}', function (User $user, $roomId) {
    if ($user->chatRooms()->where('chat_rooms.id', $roomId)->exists()) {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'avatar' => $user->avatar_url,
            'is_online' => $user->is_online
        ];
    }
});
