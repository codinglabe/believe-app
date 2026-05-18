<?php

namespace App\Events;

use App\Models\Meeting;
use App\Models\MeetingParticipant;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ParticipantRemoved implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $meeting;
    public $participant;

    public function __construct(Meeting $meeting, MeetingParticipant $participant)
    {
        $this->meeting = $meeting;
        $this->participant = $participant;
    }

    public function broadcastOn()
    {
        return new Channel('meeting.' . $this->meeting->meeting_id . '.participant.' . $this->participant->user_id);
    }

    public function broadcastWith()
    {
        return [
            'meeting_id' => $this->meeting->meeting_id,
            'participant_id' => $this->participant->id,
            'user_id' => $this->participant->user_id,
            'action' => 'removed',
            'message' => 'You have been removed from the meeting by the instructor',
        ];
    }
}
