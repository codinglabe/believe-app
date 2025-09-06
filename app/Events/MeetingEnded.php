<?php

namespace App\Events;

use App\Models\Meeting;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MeetingEnded implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $meeting;

    public function __construct(Meeting $meeting)
    {
        $this->meeting = $meeting;
    }

    public function broadcastOn()
    {
        return new Channel('meeting.' . $this->meeting->meeting_id);
    }

    public function broadcastWith()
    {
        return [
            'meeting_id' => $this->meeting->meeting_id,
            'status' => $this->meeting->status,
            'message' => 'Meeting has ended',
        ];
    }
}
