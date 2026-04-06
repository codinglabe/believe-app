<?php

namespace App\Events;

use App\Models\ChatMessage;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
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
            'user.organization',
            'replyToMessage.user.organization',
            'chatRoom.members' // Important: Load room members
        ]);
    }

    public function broadcastOn()
    {
        $channels = [];

        // Room-specific channel
        $channelType = match ($this->message->chatRoom->type) {
            'public' => 'public-chat',
            'private' => 'private-chat',
            default => 'direct-chat'
        };
        $channels[] = new Channel("{$channelType}.{$this->message->chat_room_id}");

        // Private channels for all members (for sidebar updates)
        foreach ($this->message->chatRoom->members as $member) {
            $channels[] = new PrivateChannel("user.{$member->id}");
        }

        return $channels;
    }

    public function broadcastAs()
    {
        return 'MessageSent';
    }

    public function broadcastWith()
    {
        return [
            'message' => [
                'id' => $this->message->id,
                'message' => $this->message->message,
                'attachments' => $this->message->attachments ?? [],
                'created_at' => $this->message->created_at->toISOString(),
                'is_edited' => $this->message->is_edited,
                'user' => $this->formatUser($this->message->user),
                'reply_to_message' => $this->message->replyToMessage ? [
                    'id' => $this->message->replyToMessage->id,
                    'message' => $this->message->replyToMessage->message,
                    'user' => [
                        'name' => $this->message->replyToMessage->user->name
                    ]
                ] : null,
                'chat_room_id' => $this->message->chat_room_id
            ],
            'room_update' => [
                'room_id' => $this->message->chat_room_id,
                'last_message' => [
                    'message' => $this->message->message,
                    'created_at' => $this->message->created_at->toISOString(),
                    'user_name' => $this->message->user->name
                ]
            ]
        ];
    }

    protected function formatUser($user)
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'avatar' => $user->avatar_url ?? '/placeholder.svg?height=32&width=32',
            'role' => $user->role,
            'organization' => $user->organization ? [
                'id' => $user->organization->id,
                'name' => $user->organization->name
            ] : null,
            'is_online' => $user->is_online ?? false
        ];
    }
}
