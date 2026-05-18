<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StreamingJob extends Model
{
    use HasFactory;

    protected $fillable = [
        'livestream_kind',
        'livestream_id',
        'meeting_id',
        'organization_id',
        'source_url',
        'destination_url',
        'callback_url',
        'max_duration_minutes',
        'status',
        'provider_message_id',
        'duration_minutes',
        'failure_reason',
        'accounted_at',
        'completed_at',
    ];

    protected $casts = [
        'max_duration_minutes' => 'integer',
        'duration_minutes' => 'integer',
        'accounted_at' => 'datetime',
        'completed_at' => 'datetime',
    ];
}
