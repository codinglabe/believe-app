<?php

namespace App\Events;

use App\Models\MeetingParticipant;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ParticipantJoined implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $participant;

    public function __construct(MeetingParticipant $participant)
    {
        $this->participant = $participant;
    }

    public function broadcastOn()
    {
        return new Channel('meeting.' . $this->participant->meeting_id . '.participants');
    }

    public function broadcastWith()
    {
        return [
            'participant' => [
                'id' => $this->participant->id,
                'user' => [
                    'id' => $this->participant->user->id,
                    'name' => $this->participant->user->name,
                    'avatar' => $this->participant->user->avatar,
                ],
                'role' => $this->participant->role,
                'status' => $this->participant->status,
                'is_muted' => $this->participant->is_muted,
                'is_video_enabled' => $this->participant->is_video_enabled,
                'joined_at' => $this->participant->joined_at,
            ],
        ];
    }

    public function broadcastAs()
    {
        return 'participant.joined';
    }
}
