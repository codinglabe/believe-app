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

    public function __construct(ChatRoom $room)
    {
        $this->room = $room;
    }

    public function broadcastOn()
    {
        if ($this->room->type === 'public') {
            return new Channel('chat-rooms');
        }

        // Explicitly return array of private channels
        $channels = [];
        foreach ($this->room->members as $member) {
            $channels[] = new PrivateChannel('user.' . $member->id);
        }
        return $channels;
    }

    public function broadcastAs()
    {
        return 'RoomCreated';
    }

    public function broadcastWith(): array
    {
        return [
            'room' => [
                'id' => $this->room->id,
                'name' => $this->room->name,
                'type' => $this->room->type,
                'description' => $this->room->description,
                'image_url' => $this->room->image_url,
                'created_at' => $this->room->created_at->toISOString(),
                'updated_at' => $this->room->updated_at->toISOString(),
                'members' => $this->room->members->map(function ($member) {
                    return [
                        'id' => $member->id,
                        'name' => $member->name,
                        'avatar_url' => $member->avatar_url,
                        'is_online' => $member->is_online,
                    ];
                })->toArray(),
                'is_member' => true,
                'created_by' => $this->room->created_by,
                'latest_message' => null,
                'topics' => $this->room->topics->map(function ($topic) {
                    return [
                        'id' => $topic->id,
                        'name' => $topic->name,
                        'description' => $topic->description,
                    ];
                })->toArray(),
            ]
        ];
    }
}
