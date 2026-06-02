<?php

namespace App\Events;

use App\Models\ChatRoom;
use App\Models\User;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class UserTyping implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $user;
    public $roomId;
    public $isTyping;
    public string $roomType;

    public function __construct(User $user, int $roomId, bool $isTyping, ?string $roomType = null)
    {
        $this->user = $user;
        $this->roomId = $roomId;
        $this->isTyping = $isTyping;
        $this->roomType = $roomType ?? ChatRoom::query()->whereKey($roomId)->value('type') ?? 'direct';
    }

    public function broadcastOn()
    {
        return match ($this->roomType) {
            'public' => new Channel("public-chat.{$this->roomId}"),
            'private' => new PrivateChannel("private-chat.{$this->roomId}"),
            default => new PrivateChannel("direct-chat.{$this->roomId}"),
        };
    }

    public function broadcastAs()
    {
        return 'user.typing';
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
