<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BelievePointPurchase extends Model
{
    protected $fillable = [
        'user_id',
        'amount',
        'checkout_total',
        'processing_fee_estimate',
        'platform_fee',
        'points',
        'stripe_session_id',
        'stripe_payment_intent_id',
        'status',
        'source',
        'payment_rail',
        'payment_method',
        'receipt_image',
        'reward_points_awarded',
        'points_available_at',
        'stripe_funds_available_at',
        'bridge_reserve_confirmed_at',
        'bridge_settlement_reference',
        'settlement_status',
        'settlement_at',
        'stripe_settlement_reference',
        'points_released',
        'failure_code',
        'failure_message',
        'stripe_refund_id',
        'refunded_at',
        'refund_status',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'checkout_total' => 'decimal:2',
        'processing_fee_estimate' => 'decimal:2',
        'platform_fee' => 'decimal:2',
        'points' => 'decimal:2',
        'refunded_at' => 'datetime',
        'reward_points_awarded' => 'decimal:2',
        'points_available_at' => 'datetime',
        'stripe_funds_available_at' => 'datetime',
        'bridge_reserve_confirmed_at' => 'datetime',
        'settlement_at' => 'datetime',
        'points_released' => 'boolean',
    ];

    /**
     * Check if purchase can be refunded
     */
    public function canBeRefunded(): bool
    {
        // Must be completed
        if ($this->status !== 'completed') {
            return false;
        }

        // Must not already be refunded
        if ($this->refunded_at !== null) {
            return false;
        }

        // Must be within 7 days
        $sevenDaysAgo = now()->subDays(7);
        if ($this->created_at->lt($sevenDaysAgo)) {
            return false;
        }

        // Must have payment intent for Stripe refund
        if (! $this->stripe_payment_intent_id) {
            return false;
        }

        return true;
    }

    /**
     * Check if user still has the points in balance
     */
    public function userHasPointsInBalance(): bool
    {
        $user = $this->user;
        if (! $user) {
            return false;
        }

        $available = (float) $user->believe_points;
        $processing = (float) ($user->processing_believe_points ?? 0);
        if ($this->points_released) {
            return $available >= (float) $this->points;
        }

        return ($available + $processing) >= (float) $this->points;
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
