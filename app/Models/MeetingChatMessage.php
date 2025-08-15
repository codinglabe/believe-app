<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MeetingChatMessage extends Model
{
     use HasFactory;

    protected $fillable = [
        'meeting_id',
        'user_id',
        'message',
        'message_type',
        'is_private',
        'recipient_id',
        'metadata',
    ];

    protected $casts = [
        'is_private' => 'boolean',
        'metadata' => 'array',
        'created_at' => 'datetime',
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

    public function recipient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recipient_id');
    }

    // Scopes
    public function scopePublic($query)
    {
        return $query->where('is_private', false);
    }

    public function scopePrivate($query)
    {
        return $query->where('is_private', true);
    }

    public function scopeForUser($query, $userId)
    {
        return $query->where(function ($q) use ($userId) {
            $q->where('is_private', false)
              ->orWhere(function ($privateQuery) use ($userId) {
                  $privateQuery->where('is_private', true)
                              ->where(function ($recipientQuery) use ($userId) {
                                  $recipientQuery->where('user_id', $userId)
                                                ->orWhere('recipient_id', $userId);
                              });
              });
        });
    }

    // Methods
    public function isFromUser(int $userId): bool
    {
        return $this->user_id === $userId;
    }

    public function isToUser(int $userId): bool
    {
        return $this->recipient_id === $userId;
    }

    public function canBeSeenByUser(int $userId): bool
    {
        if (!$this->is_private) {
            return true;
        }

        return $this->isFromUser($userId) || $this->isToUser($userId);
    }
}
