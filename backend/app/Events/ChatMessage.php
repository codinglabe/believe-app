<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Queue\SerializesModels;

class ChatMessage implements ShouldBroadcastNow
{
    use InteractsWithSockets, SerializesModels;

    public $message;
    public $meetingId;
    public $userName;

    public function __construct($message, $meetingId, $userName)
    {
        $this->message = $message;
        $this->meetingId = $meetingId;
        $this->userName = $userName;
    }

    public function broadcastOn()
    {
        return new Channel("meeting.{$this->meetingId}");
    }
}
