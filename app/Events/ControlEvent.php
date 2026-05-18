<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Queue\SerializesModels;

class ControlEvent implements ShouldBroadcastNow
{
    use InteractsWithSockets, SerializesModels;

    public $action;
    public $meetingId;
    public $userId;

    public function __construct($action, $meetingId, $userId)
    {
        $this->action = $action; // e.g., 'mute_all'
        $this->meetingId = $meetingId;
        $this->userId = $userId;
    }

    public function broadcastOn()
    {
        return new Channel("meeting.{$this->meetingId}");
    }
}