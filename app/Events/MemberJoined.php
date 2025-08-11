<?php

namespace App\Events;

use App\Models\ChatRoom;
use App\Models\User;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MemberJoined implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $room;
    public $user;

    public function __construct(ChatRoom $room, User $user)
    {
        $this->room = $room;
        $this->user = $user;
    }

    public function broadcastOn()
    {
        return new Channel('public-chat.' . $this->room->id);
    }

    public function broadcastAs()
    {
        return 'member.joined';
    }
}
