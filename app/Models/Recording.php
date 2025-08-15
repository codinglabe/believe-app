<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class Recording extends Model
{
    use HasFactory;

    protected $fillable = [
        'meeting_id',
        'instructor_id',
        'filename',
        'original_filename',
        'file_path',
        'dropbox_path',
        'file_size',
        'duration_seconds',
        'mime_type',
        'status',
        'upload_progress',
        'started_at',
        'ended_at',
        'metadata',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
        'metadata' => 'array',
    ];

    // Relationships
    public function meeting(): BelongsTo
    {
        return $this->belongsTo(Meeting::class);
    }

    public function instructor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'instructor_id');
    }

    // Accessors
    public function getFormattedFileSizeAttribute(): string
    {
        $bytes = $this->file_size;
        $units = ['B', 'KB', 'MB', 'GB'];
        
        for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
            $bytes /= 1024;
        }
        
        return round($bytes, 2) . ' ' . $units[$i];
    }

    public function getFormattedDurationAttribute(): string
    {
        $seconds = $this->duration_seconds;
        $hours = floor($seconds / 3600);
        $minutes = floor(($seconds % 3600) / 60);
        $seconds = $seconds % 60;

        if ($hours > 0) {
            return sprintf('%02d:%02d:%02d', $hours, $minutes, $seconds);
        }
        
        return sprintf('%02d:%02d', $minutes, $seconds);
    }

    public function getDownloadUrlAttribute(): ?string
    {
        if ($this->status === 'completed' && $this->dropbox_path) {
            return route('recordings.download', ['recording' => $this->id]);
        }
        
        return null;
    }

    public function getStreamUrlAttribute(): ?string
    {
        if ($this->status === 'completed' && $this->dropbox_path) {
            return route('recordings.stream', ['recording' => $this->id]);
        }
        
        return null;
    }

    // Methods
    public function markAsUploading(): void
    {
        $this->update([
            'status' => 'uploading',
            'upload_progress' => 0,
        ]);
    }

    public function updateUploadProgress(int $progress): void
    {
        $this->update(['upload_progress' => $progress]);
    }

    public function markAsCompleted(string $dropboxPath): void
    {
        $this->update([
            'status' => 'completed',
            'dropbox_path' => $dropboxPath,
            'upload_progress' => 100,
        ]);
    }

    public function markAsFailed(?string $error = null): void
    {
        $metadata = $this->metadata ?? [];
        if ($error) {
            $metadata['error'] = $error;
        }

        $this->update([
            'status' => 'failed',
            'metadata' => $metadata,
        ]);
    }
}
