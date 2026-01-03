<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BelievePointPurchase extends Model
{
    protected $fillable = [
        'user_id',
        'amount',
        'points',
        'stripe_session_id',
        'stripe_payment_intent_id',
        'status',
        'stripe_refund_id',
        'refunded_at',
        'refund_status',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'points' => 'decimal:2',
        'refunded_at' => 'datetime',
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
        if (!$this->stripe_payment_intent_id) {
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
        if (!$user) {
            return false;
        }

        return (float) $user->believe_points >= (float) $this->points;
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
