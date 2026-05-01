<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Donation extends Model
{
    protected $fillable = [
        'user_id',
        'organization_id',
        'stripe_connect_account_id',
        'care_alliance_id',
        'amount',
        'donor_covers_processing_fees',
        'processing_fee_estimate',
        'checkout_total',
        'frequency',
        'payment_method',
        'transaction_id',
        'stripe_checkout_session_id',
        'status',
        'messages',
        'message',
        'donation_date',
    ];

    protected $casts = [
        'donation_date' => 'datetime',
        'amount' => 'decimal:2',
        'donor_covers_processing_fees' => 'boolean',
        'processing_fee_estimate' => 'decimal:2',
        'checkout_total' => 'decimal:2',
    ];

    /**
     * Get the formatted amount in dollars.
     *
     * @return string
     */
    public function getFormattedAmountAttribute()
    {
        return number_format($this->amount / 100, 2);
    }

    /**
     * Get the user that made the donation.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the organization that received the donation.
     */
    public function organization()
    {
        return $this->belongsTo(Organization::class);
    }

    public function careAlliance(): BelongsTo
    {
        return $this->belongsTo(CareAlliance::class);
    }
}
