<?php

namespace App\Events;

use App\Models\ChatMessage;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageSent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $message;

    public function __construct(ChatMessage $message)
    {
        $this->message = $message->loadMissing([
            'user',
            'replyToMessage.user',
            'chatRoom'
        ]);
    }

    public function broadcastOn()
    {
        $channelType = match ($this->message->chatRoom->type) {
            'public' => 'public-chat',
            'private' => 'private-chat',
            default => 'direct-chat'
        };

        return new Channel("{$channelType}.{$this->message->chat_room_id}");
    }

    public function broadcastAs()
    {
        return 'message.sent';
    }

    public function broadcastWith()
    {
        return [
            'message' => [
                'id' => $this->message->id,
                'content' => $this->message->message,
                'attachments' => $this->message->attachments,
                'created_at' => $this->message->created_at->toISOString(),
                'is_edited' => $this->message->is_edited,
                'user' => [
                    'id' => $this->message->user->id,
                    'name' => $this->message->user->name,
                    'avatar' => $this->message->user->avatar_url,
                ],
                'reply_to_message' => $this->message->replyToMessage ? [
                    'id' => $this->message->replyToMessage->id,
                    'content' => $this->message->replyToMessage->message,
                    'user' => [
                        'name' => $this->message->replyToMessage->user->name
                    ]
                ] : null,
                'chat_room_id' => $this->message->chat_room_id
            ]
        ];
    }
}
