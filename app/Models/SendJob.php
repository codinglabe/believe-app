<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SendJob extends Model
{
    use HasFactory;

    protected $fillable = [
        'scheduled_drop_id',
        'user_id',
        'channel',
        'status',
        'idempotency_key',
        'error',
        'sent_at',
        'metadata'
    ];

    protected $casts = [
        'sent_at' => 'datetime',
        'metadata' => 'array',
    ];

    public function scheduledDrop()
    {
        return $this->belongsTo(ScheduledDrop::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Scopes
    public function scopeQueued($query)
    {
        return $query->where('status', 'queued');
    }

    public function scopeFailed($query)
    {
        return $query->where('status', 'failed');
    }

    public function scopeForChannel($query, $channel)
    {
        return $query->where('channel', $channel);
    }
}
