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
        'ecs_task_arn',
        'ecs_last_status',
        'ecs_checked_at',
        'duration_minutes',
        'failure_reason',
        'accounted_at',
        'completed_at',
        'last_heartbeat_at',
        'live_at',
    ];

    protected $casts = [
        'max_duration_minutes' => 'integer',
        'duration_minutes' => 'integer',
        'accounted_at' => 'datetime',
        'completed_at' => 'datetime',
        'last_heartbeat_at' => 'datetime',
        'live_at' => 'datetime',
        'ecs_checked_at' => 'datetime',
    ];

    public function isTerminal(): bool
    {
        return in_array($this->status, ['completed', 'failed', 'stopped'], true);
    }

    public function isActive(): bool
    {
        return in_array($this->status, ['queued', 'starting', 'live'], true);
    }
}
