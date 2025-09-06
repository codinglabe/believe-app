<?php

namespace App\Events;

use App\Models\MeetingChatMessage;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MeetingMessageDeleted implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $messageId;
    public $meetingId;

    public function __construct(MeetingChatMessage $message)
    {
        $this->messageId = $message->id;
        $this->meetingId = $message->meeting_id;
    }

    public function broadcastOn()
    {
        return new Channel('meeting.' . $this->meetingId . '.chat');
    }

    public function broadcastWith()
    {
        return [
            'message_id' => $this->messageId,
            'action' => 'deleted',
        ];
    }
}
