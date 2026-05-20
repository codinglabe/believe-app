<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RecordingYoutubeUpload extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_UPLOADING = 'uploading';

    public const STATUS_PUBLISHED = 'published';

    public const STATUS_FAILED = 'failed';

    protected $fillable = [
        'user_id',
        'dropbox_path',
        'dropbox_name',
        'status',
        'title',
        'description',
        'privacy_status',
        'youtube_video_id',
        'youtube_watch_url',
        'error_message',
        'attempts',
        'started_at',
        'published_at',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'published_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function markUploading(): void
    {
        $this->update([
            'status' => self::STATUS_UPLOADING,
            'started_at' => $this->started_at ?? now(),
            'error_message' => null,
        ]);
    }

    public function markPublished(string $videoId, string $watchUrl): void
    {
        $this->update([
            'status' => self::STATUS_PUBLISHED,
            'youtube_video_id' => $videoId,
            'youtube_watch_url' => $watchUrl,
            'published_at' => now(),
            'error_message' => null,
        ]);
    }

    public function markFailed(string $message): void
    {
        $this->update([
            'status' => self::STATUS_FAILED,
            'error_message' => $message,
        ]);
    }
}
