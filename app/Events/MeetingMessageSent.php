<?php

namespace App\Events;

use App\Models\MeetingChatMessage;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MeetingMessageSent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $message;

    public function __construct(MeetingChatMessage $message)
    {
        $this->message = $message;
    }

    /**
     * The channels the event should broadcast on.
     */
    public function broadcastOn()
    {
        if ($this->message->is_private && $this->message->recipient_id) {
            // Private message: only sender and recipient
            return [
                new PrivateChannel('meeting.' . $this->message->meeting_id . '.user.' . $this->message->user_id),
                new PrivateChannel('meeting.' . $this->message->meeting_id . '.user.' . $this->message->recipient_id),
            ];
        }

        // Public chat: everyone in the meeting
        return new Channel('meeting.' . $this->message->meeting_id . '.chat');
    }

    /**
     * Data to broadcast with the event.
     */
    public function broadcastWith()
    {
        return [
            'id' => $this->message->id,
            'content' => $this->message->message,
            'user' => [
                'id' => $this->message->user->id,
                'name' => $this->message->user->name,
                'avatar' => $this->message->user->avatar,
                'role' => $this->getUserRole($this->message->user),
            ],
            'type' => $this->message->message_type,
            'timestamp' => $this->message->created_at->format('H:i'),
            'created_at' => $this->message->created_at->toISOString(),
            'is_private' => $this->message->is_private,
            'metadata' => $this->message->metadata ?? [],
        ];
    }

    /**
     * Event name for broadcasting.
     */
    public function broadcastAs()
    {
        return 'message.sent';
    }

    /**
     * Map user roles to meeting roles.
     */
    private function getUserRole($user)
    {
        if ($user->hasRole('admin')) {
            return 'Host';
        } elseif ($user->hasRole('organization')) {
            return 'Organization';
        } elseif ($user->hasRole('user')) {
            return 'Student';
        }
        return 'User';
    }
}
