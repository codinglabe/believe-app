<?php

namespace App\Events;

use App\Models\ChatMessage;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class EmojiReaction implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $reaction;

    public function __construct(ChatMessage $reaction)
    {
        $this->reaction = $reaction;
    }

    public function broadcastOn()
    {
        return new Channel('meeting.' . $this->reaction->meeting_id . '.reactions');
    }

    public function broadcastWith()
    {
        return [
            'id' => $this->reaction->id,
            'emoji' => $this->reaction->message,
            'user' => [
                'id' => $this->reaction->user->id,
                'name' => $this->reaction->user->name,
                'avatar' => $this->reaction->user->avatar,
            ],
            'timestamp' => $this->reaction->created_at->format('H:i'),
            'metadata' => $this->reaction->metadata,
        ];
    }

    public function broadcastAs()
    {
        return 'emoji.reaction';
    }
}
