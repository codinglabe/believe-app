<?php

namespace App\Events;

use App\Models\ChatMessage;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageSent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $message;

    /**
     * Create a new event instance.
     */
    public function __construct(ChatMessage $message)
    {
        // Eager load relationships needed for broadcasting
        $this->message = $message->load('user.organization', 'replyToMessage.user');
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        // Broadcast to the specific chat room's presence channel
        // Public rooms can use a public channel, private/direct use presence
        if ($this->message->chatRoom->type === 'public') {
            return [new Channel('chat.' . $this->message->chat_room_id)];
        } else {
            return [new PresenceChannel('presence-chat-room.' . $this->message->chat_room_id)];
        }
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'message.sent';
    }

    /**
     * Get the data to broadcast.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'id' => $this->message->id,
            'message' => $this->message->message,
            'attachments' => $this->message->attachments,
            'created_at' => $this->message->created_at->toISOString(),
            'is_edited' => $this->message->is_edited,
            'chat_room_id' => $this->message->chat_room_id,
            'user' => [
                'id' => $this->message->user->id,
                'name' => $this->message->user->name,
                'avatar' => $this->message->user->avatar_url,
                'role' => $this->message->user->role,
                'organization' => $this->message->user->organization ? [
                    'id' => $this->message->user->organization->id,
                    'name' => $this->message->user->organization->name,
                ] : null,
            ],
            'reply_to_message' => $this->message->replyToMessage ? [
                'id' => $this->message->replyToMessage->id,
                'message' => $this->message->replyToMessage->message,
                'user' => [
                    'name' => $this->message->replyToMessage->user->name,
                ],
            ] : null,
        ];
    }
}
