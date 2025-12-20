<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GiftCard extends Model
{
    protected $fillable = [
        'user_id',
        'organization_id',
        'external_id',
        'voucher',
        'card_number',
        'amount',
        'commission_percentage',
        'total_commission',
        'platform_commission',
        'nonprofit_commission',
        'brand',
        'brand_name',
        'country',
        'currency',
        'is_sent',
        'status',
        'stripe_payment_intent_id',
        'stripe_session_id',
        'phaze_disbursement_id',
        'purchased_at',
        'expires_at',
        'meta',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'commission_percentage' => 'decimal:6', // Support up to 6 decimal places for percentages
        'total_commission' => 'decimal:8', // Support up to 8 decimal places for very small commission amounts
        'platform_commission' => 'decimal:8', // Support up to 8 decimal places for very small commission amounts
        'nonprofit_commission' => 'decimal:8', // Support up to 8 decimal places for very small commission amounts
        'is_sent' => 'boolean',
        'purchased_at' => 'datetime',
        'expires_at' => 'datetime',
        'meta' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function isActive(): bool
    {
        return $this->status === 'active' &&
               (!$this->expires_at || $this->expires_at->isFuture());
    }

    public function isExpired(): bool
    {
        return $this->expires_at && $this->expires_at->isPast();
    }
}
