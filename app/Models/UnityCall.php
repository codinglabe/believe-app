<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class UnityCall extends Model
{
    public const TYPE_AUDIO = 'audio';

    public const STATUS_RINGING = 'ringing';

    public const STATUS_ACCEPTED = 'accepted';

    public const STATUS_DECLINED = 'declined';

    public const STATUS_MISSED = 'missed';

    public const STATUS_ENDED = 'ended';

    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'caller_id',
        'chat_room_id',
        'user_livestream_id',
        'chat_message_id',
        'type',
        'status',
        'ring_expires_at',
        'answered_at',
        'ended_at',
    ];

    protected $casts = [
        'ring_expires_at' => 'datetime',
        'answered_at' => 'datetime',
        'ended_at' => 'datetime',
    ];

    public function caller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'caller_id');
    }

    public function chatRoom(): BelongsTo
    {
        return $this->belongsTo(ChatRoom::class, 'chat_room_id');
    }

    public function chatMessage(): BelongsTo
    {
        return $this->belongsTo(ChatMessage::class);
    }

    public function livestream(): BelongsTo
    {
        return $this->belongsTo(UserLivestream::class, 'user_livestream_id');
    }

    public function participants(): HasMany
    {
        return $this->hasMany(UnityCallParticipant::class);
    }

    public function isActive(): bool
    {
        return in_array($this->status, [self::STATUS_RINGING, self::STATUS_ACCEPTED], true);
    }

    public function participantForUser(int $userId): ?UnityCallParticipant
    {
        return $this->participants()->where('user_id', $userId)->first();
    }
}
