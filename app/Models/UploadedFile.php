<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UploadedFile extends Model
{
    use HasFactory;

    protected $fillable = [
        'upload_id',
        'file_name',
        'original_name',
        'file_type',
        'file_size',
        'file_extension',
        'total_rows',
        'processed_rows',
        'total_chunks',
        'processed_chunks',
        'uploaded_chunks_list',
        'status',
        'path',
    ];

    protected $casts = [
        'uploaded_chunks_list' => 'array',
        'file_size' => 'integer',
        'total_rows' => 'integer',
        'processed_rows' => 'integer',
        'total_chunks' => 'integer',
        'processed_chunks' => 'integer',
    ];

    // Define status constants
    const STATUS_UPLOADING = 'uploading';
    const STATUS_PROCESSING = 'processing';
    const STATUS_COMPLETED = 'completed';
    const STATUS_FAILED = 'failed';
    const STATUS_CANCELLED = 'cancelled';
    const STATUS_DELETING = 'deleting'; // New status

    public function getProgressAttribute()
    {
        return $this->total_chunks > 0
            ? round(($this->processed_chunks / $this->total_chunks) * 100, 2)
            : 0;
    }

    public function isCompleted()
    {
        return $this->status === self::STATUS_COMPLETED;
    }

    public function isUploading()
    {
        return $this->status === self::STATUS_UPLOADING;
    }

    public function isProcessing()
    {
        return $this->status === self::STATUS_PROCESSING;
    }

    public function hasFailed()
    {
        return $this->status === self::STATUS_FAILED;
    }

    public function isDeleting()
    {
        return $this->status === self::STATUS_DELETING;
    }
}
