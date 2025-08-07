<?php

namespace App\Events;

use App\Models\User;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class UserTyping implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $user;
    public $roomId;
    public $isTyping;

    /**
     * Create a new event instance.
     */
    public function __construct(User $user, int $roomId, bool $isTyping)
    {
        $this->user = $user->load('organization'); // Load organization for the user
        $this->roomId = $roomId;
        $this->isTyping = $isTyping;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        // Broadcast to the specific chat room's presence channel
        // This ensures typing indicators are only seen by members of that room
        return [new PresenceChannel('presence-chat-room.' . $this->roomId)];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'user.typing';
    }

    /**
     * Get the data to broadcast.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'user' => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'avatar' => $this->user->avatar_url,
                'is_online' => $this->user->is_online,
                'role' => $this->user->role,
                'organization' => $this->user->organization ? [
                    'id' => $this->user->organization->id,
                    'name' => $this->user->organization->name,
                ] : null,
            ],
            'room_id' => $this->roomId,
            'is_typing' => $this->isTyping,
        ];
    }
}
