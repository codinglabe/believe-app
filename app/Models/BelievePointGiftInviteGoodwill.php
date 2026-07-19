<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BelievePointGiftInviteGoodwill extends Model
{
    public const REASON_CANCELLED = 'cancelled';

    public const REASON_EMAIL_CHANGED = 'email_changed';

    protected $fillable = [
        'invite_id',
        'sender_id',
        'email',
        'sender_name',
        'brp_amount',
        'reason',
        'awarded_at',
        'awarded_user_id',
    ];

    protected $casts = [
        'brp_amount' => 'decimal:2',
        'awarded_at' => 'datetime',
    ];

    public function invite(): BelongsTo
    {
        return $this->belongsTo(BelievePointGiftInvite::class, 'invite_id');
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function awardedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'awarded_user_id');
    }

    public function isAwarded(): bool
    {
        return $this->awarded_at !== null;
    }
}
