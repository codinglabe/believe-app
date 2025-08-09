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

        return new PrivateChannel('users.' . $this->room->created_by);
    }

    public function broadcastAs()
    {
        return 'RoomCreated';
    }

    public function broadcastWith()
    {
        return [
            'room' => $this->room->load(['members', 'latestMessage.user'])
        ];
    }
}
