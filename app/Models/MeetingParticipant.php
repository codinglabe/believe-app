<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MeetingParticipant extends Model
{
    use HasFactory;

    protected $fillable = [
        'meeting_id',
        'user_id',
        'roll_id',
        'status',
        'joined_at',
        'left_at',
        'is_muted',
        'is_video_enabled',
        'connection_quality',
    ];

    protected $casts = [
        'joined_at' => 'datetime',
        'left_at' => 'datetime',
        'is_muted' => 'boolean',
        'is_video_enabled' => 'boolean',
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
    public function markAsJoined(): void
    {
        $this->update([
            'status' => 'joined',
            'joined_at' => now(),
        ]);
    }

    public function markAsLeft(): void
    {
        $this->update([
            'status' => 'left',
            'left_at' => now(),
        ]);
    }

    public function mute(): void
    {
        $this->update(['is_muted' => true]);
        event(new \App\Events\ParticipantMuted($this->meeting, $this, true));
    }

    public function unmute(): void
    {
        $this->update(['is_muted' => false]);
        event(new \App\Events\ParticipantMuted($this->meeting, $this, false));
    }

    public function toggleVideo(): void
    {
        $this->update(['is_video_enabled' => !$this->is_video_enabled]);
    }

    public function updateConnectionQuality(string $quality): void
    {
        $this->update(['connection_quality' => $quality]);
    }
}
