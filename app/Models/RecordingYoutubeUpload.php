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

    public const STAGE_QUEUED = 'queued';

    public const STAGE_DOWNLOADING = 'downloading';

    public const STAGE_UPLOADING = 'uploading';

    public const STAGE_PROCESSING = 'processing';

    public const STAGE_COMPLETE = 'complete';

    protected $fillable = [
        'user_id',
        'dropbox_path',
        'dropbox_path_hash',
        'dropbox_name',
        'status',
        'title',
        'description',
        'privacy_status',
        'youtube_video_id',
        'youtube_watch_url',
        'error_message',
        'attempts',
        'progress_stage',
        'progress_percent',
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

    public static function hashDropboxPath(string $dropboxPath): string
    {
        return hash('sha256', $dropboxPath);
    }

    protected static function booted(): void
    {
        static::saving(function (RecordingYoutubeUpload $upload): void {
            if ($upload->dropbox_path !== null && $upload->dropbox_path !== '') {
                $upload->dropbox_path_hash = self::hashDropboxPath($upload->dropbox_path);
            }
        });
    }

    public function markUploading(): void
    {
        $this->update([
            'status' => self::STATUS_UPLOADING,
            'started_at' => $this->started_at ?? now(),
            'error_message' => null,
            'progress_stage' => self::STAGE_DOWNLOADING,
            'progress_percent' => max((int) $this->progress_percent, 5),
        ]);
    }

    public function updateProgress(string $stage, int $percent): void
    {
        $this->update([
            'progress_stage' => $stage,
            'progress_percent' => min(100, max(0, $percent)),
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
            'progress_stage' => self::STAGE_COMPLETE,
            'progress_percent' => 100,
        ]);
    }

    public function markFailed(string $message): void
    {
        $this->update([
            'status' => self::STATUS_FAILED,
            'error_message' => $message,
            'progress_stage' => null,
        ]);
    }
}
