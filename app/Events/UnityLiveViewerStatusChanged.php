<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Queued Reverb broadcast (same pattern as MeetingStarted, ParticipantJoined, etc.).
 * Requires a running queue worker: php artisan queue:work
 */
class UnityLiveViewerStatusChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * @param  array<string, mixed>  $payload
     */
    public function __construct(
        public string $channelName,
        public string $reason,
        public array $payload,
    ) {}

    /**
     * Broadcast after the DB transaction commits when the host action runs in a transaction.
     */
    public bool $broadcastAfterCommit = true;

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new Channel($this->channelName),
        ];
    }

    public function broadcastAs(): string
    {
        return 'viewer.status';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return $this->payload;
    }
}
