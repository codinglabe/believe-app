<?php

namespace App\Events;

use App\Models\MeetingParticipant;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ParticipantLeft implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $participantData;
    public $meetingId;

    public function __construct(array $participantData, int $meetingId)
    {
        $this->participantData = $participantData;
        $this->meetingId = $meetingId;
    }

    public function broadcastOn()
    {
        return new Channel('meeting.' . $this->meetingId . '.participants');
    }

    public function broadcastWith()
    {
        return [
            'participant' => $this->participantData,
        ];
    }

    public function broadcastAs()
    {
        return 'participant.left';
    }
}
