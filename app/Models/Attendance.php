<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Attendance extends Model
{
    use HasFactory;

    protected $fillable = [
        'meeting_id',
        'user_id',
        'roll_id',
        'joined_at',
        'left_at',
        'duration_minutes',
        'status',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'joined_at' => 'datetime',
        'left_at' => 'datetime',
    ];

    // Relationships
    public function meeting(): BelongsTo
    {
        return $this->belongsTo(Meeting::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // Methods
    public function calculateDuration(): int
    {
        if ($this->joined_at && $this->left_at) {
            return $this->joined_at->diffInMinutes($this->left_at);
        }
        
        if ($this->joined_at) {
            return $this->joined_at->diffInMinutes(now());
        }

        return 0;
    }

    public function markAsLeft(): void
    {
        $this->update([
            'left_at' => now(),
            'duration_minutes' => $this->calculateDuration(),
            'status' => 'completed',
        ]);
    }

    public function getFormattedDurationAttribute(): string
    {
        $minutes = $this->duration_minutes ?: $this->calculateDuration();
        $hours = floor($minutes / 60);
        $mins = $minutes % 60;

        if ($hours > 0) {
            return sprintf('%dh %dm', $hours, $mins);
        }
        
        return sprintf('%dm', $mins);
    }
}
