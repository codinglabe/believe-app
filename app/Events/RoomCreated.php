<?php

namespace App\Events;

use App\Models\ChatRoom;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class RoomCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $room;

    /**
     * Create a new event instance.
     */
    public function __construct(ChatRoom $room)
    {
        // Eager load relationships needed for broadcasting
        $this->room = $room->load('members.organization', 'latestMessage.user');
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        // Broadcast to a general channel for new rooms, and also to private channels of members
        $channels = [
            new Channel('chat-rooms'), // Public channel for all users to discover new rooms
        ];

        // For private/direct rooms, broadcast to each member's private channel
        // This ensures only relevant users get the notification for private rooms
        if ($this->room->type === 'private' || $this->room->type === 'direct') {
            foreach ($this->room->members as $member) {
                $channels[] = new PrivateChannel('users.' . $member->id);
            }
        }

        return $channels;
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'room.created';
    }

    /**
     * Get the data to broadcast.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'id' => $this->room->id,
            'name' => $this->room->name,
            'type' => $this->room->type,
            'description' => $this->room->description,
            'image' => $this->room->image_url,
            'created_at' => $this->room->created_at->toISOString(),
            'last_message' => $this->room->latestMessage ? [
                'message' => $this->room->latestMessage->message ?: '[Attachment]',
                'created_at' => $this->room->latestMessage->created_at->toISOString(),
                'user_name' => $this->room->latestMessage->user->name,
            ] : null,
            'unread_count' => 0, // New rooms start with 0 unread for the creator/added members
            'is_member' => true, // The user who created/was added is a member
            'created_by' => $this->room->created_by,
            'members' => $this->room->members->map(fn($member) => [
                'id' => $member->id,
                'name' => $member->name,
                'avatar' => $member->avatar_url,
                'is_online' => $member->is_online,
                'role' => $member->role,
                'organization' => $member->organization ? ['id' => $member->organization->id, 'name' => $member->organization->name] : null,
            ]),
        ];
    }
}
