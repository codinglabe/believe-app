<?php

namespace App\Events;

use App\Models\ChatRoom;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MemberLeft implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $roomId;
    public $userId;
    public string $roomType;

    public function __construct(int $roomId, int $userId, ?string $roomType = null)
    {
        $this->roomId = $roomId;
        $this->userId = $userId;
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
        return 'member.left';
    }

    public function broadcastWith()
    {
        return [
            'user_id' => $this->userId,
        ];
    }
}
