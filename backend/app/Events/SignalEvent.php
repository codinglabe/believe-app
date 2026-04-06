<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Queue\SerializesModels;

class SignalEvent implements ShouldBroadcast
{
    use InteractsWithSockets, SerializesModels;

    public $signalData;
    public $meetingId;
    public $userId;

    public function __construct($signalData, $meetingId, $userId)
    {
        $this->signalData = $signalData;
        $this->meetingId = $meetingId;
        $this->userId = $userId;
    }

    public function broadcastOn()
    {
        return new Channel("meeting.{$this->meetingId}");
    }

    public function broadcastWith()
    {
        return ['signal' => $this->signalData, 'userId' => $this->userId];
    }
}