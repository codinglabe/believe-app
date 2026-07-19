<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BelievePointGiftInvite extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_CLAIMED = 'claimed';

    public const STATUS_EXPIRED = 'expired';

    public const STATUS_CANCELLED = 'cancelled';

    protected $fillable = [
        'sender_id',
        'recipient_email',
        'recipient_id',
        'gift_occasion_id',
        'amount',
        'occasion',
        'message',
        'token',
        'status',
        'expires_at',
        'claimed_at',
        'refunded_at',
        'cancelled_at',
        'last_resent_at',
        'supporter_believe_point_gift_id',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'expires_at' => 'datetime',
        'claimed_at' => 'datetime',
        'refunded_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'last_resent_at' => 'datetime',
    ];

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function recipient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recipient_id');
    }

    public function giftOccasion(): BelongsTo
    {
        return $this->belongsTo(GiftOccasion::class, 'gift_occasion_id');
    }

    public function gift(): BelongsTo
    {
        return $this->belongsTo(SupporterBelievePointGift::class, 'supporter_believe_point_gift_id');
    }

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    public function isCancelled(): bool
    {
        return $this->status === self::STATUS_CANCELLED;
    }

    public function registerUrl(): string
    {
        return route('register.user', [
            'gift_invite' => $this->token,
            'email' => $this->recipient_email,
        ], true);
    }
}
