<?php

namespace App\Events;

use App\Models\User;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class UserTyping implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $user;
    public $roomId;
    public $isTyping;

    public function __construct(User $user, int $roomId, bool $isTyping)
    {
        $this->user = $user;
        $this->roomId = $roomId;
        $this->isTyping = $isTyping;
    }

    public function broadcastOn()
    {
        return new Channel("typing.{$this->roomId}");
    }

    public function broadcastAs()
    {
        return 'UserTyping';
    }

    public function broadcastWith()
    {
        return [
            'user' => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'avatar' => $this->user->avatar_url ?? '/placeholder.svg?height=32&width=32',
            ],
            'room_id' => $this->roomId,
            'is_typing' => $this->isTyping,
        ];
    }
}
