<?php
// app/Events/MessageSent.php
namespace App\Events;

use App\Models\ChatMessage;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageSent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public ChatMessage $message
    ) {
    }

    public function broadcastOn(): array
    {
        return [
            new PresenceChannel('chat-room.' . $this->message->chat_room_id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'MessageSent';
    }

    public function broadcastWith(): array
    {
        return [
            'message' => [
                'id' => $this->message->id,
                'message' => $this->message->message,
                'attachments' => $this->message->attachments,
                'created_at' => $this->message->created_at->toISOString(),
                'is_edited' => $this->message->is_edited,
                'chat_room_id' => $this->message->chat_room_id,
                'user' => [
                    'id' => $this->message->user->id,
                    'name' => $this->message->user->name,
                    'avatar' => $this->message->user->avatar_url ?? '/placeholder.svg?height=32&width=32',
                ],
                'reply_to_message' => $this->message->replyToMessage ? [
                    'id' => $this->message->replyToMessage->id,
                    'message' => $this->message->replyToMessage->message,
                    'user' => [
                        'name' => $this->message->replyToMessage->user->name,
                    ],
                ] : null,
            ],
        ];
    }
}
