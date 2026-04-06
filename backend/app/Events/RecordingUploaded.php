<?php

namespace App\Events;

use App\Models\Recording;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class RecordingUploaded implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $recording;

    public function __construct(Recording $recording)
    {
        $this->recording = $recording;
    }

    public function broadcastOn()
    {
        return new Channel('meeting.' . $this->recording->meeting->meeting_id . '.recordings');
    }

    public function broadcastWith()
    {
        return [
            'recording' => [
                'id' => $this->recording->id,
                'filename' => $this->recording->original_filename,
                'duration' => $this->recording->formatted_duration,
                'file_size' => $this->recording->formatted_file_size,
                'status' => $this->recording->status,
                'download_url' => $this->recording->download_url,
                'stream_url' => $this->recording->stream_url,
            ],
            'message' => 'Recording uploaded successfully',
        ];
    }
}
