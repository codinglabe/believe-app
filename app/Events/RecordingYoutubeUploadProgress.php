<?php

namespace App\Events;

use App\Models\RecordingYoutubeUpload;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Real-time YouTube recording upload progress (Reverb → private user channel).
 */
class RecordingYoutubeUploadProgress implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * @param  array<string, mixed>  $payload
     */
    public function __construct(
        public int $userId,
        public array $payload,
    ) {}

    public bool $broadcastAfterCommit = false;

    /**
     * @return array<int, PrivateChannel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('user.'.$this->userId),
        ];
    }

    public function broadcastAs(): string
    {
        return 'recording.youtube.upload.progress';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return $this->payload;
    }

    public static function fromUpload(RecordingYoutubeUpload $upload): self
    {
        return new self((int) $upload->user_id, [
            'dropbox_path' => $upload->dropbox_path,
            'status' => $upload->status,
            'title' => $upload->title,
            'privacy_status' => $upload->privacy_status,
            'youtube_video_id' => $upload->youtube_video_id,
            'youtube_watch_url' => $upload->youtube_watch_url,
            'error_message' => $upload->error_message,
            'progress_stage' => $upload->progress_stage,
            'progress_percent' => (int) $upload->progress_percent,
            'published_at' => $upload->published_at?->toIso8601String(),
        ]);
    }
}
