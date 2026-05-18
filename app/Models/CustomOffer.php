<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomOffer extends Model
{
    protected $fillable = [
        'gig_id',
        'seller_id',
        'buyer_id',
        'title',
        'description',
        'price',
        'delivery_time',
        'requirements',
        'status',
        'expires_at',
        'accepted_at',
        'rejected_at',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'expires_at' => 'datetime',
        'accepted_at' => 'datetime',
        'rejected_at' => 'datetime',
    ];

    /**
     * Get the gig for this offer.
     */
    public function gig(): BelongsTo
    {
        return $this->belongsTo(Gig::class, 'gig_id');
    }

    /**
     * Get the seller (user) for this offer.
     */
    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    /**
     * Get the buyer (user) for this offer.
     */
    public function buyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'buyer_id');
    }

    /**
     * Check if offer is expired.
     */
    public function isExpired(): bool
    {
        if (!$this->expires_at) {
            return false;
        }
        return now()->greaterThan($this->expires_at);
    }

    /**
     * Accept the offer.
     */
    public function accept()
    {
        $this->update([
            'status' => 'accepted',
            'accepted_at' => now(),
        ]);
    }

    /**
     * Reject the offer.
     */
    public function reject()
    {
        $this->update([
            'status' => 'rejected',
            'rejected_at' => now(),
        ]);
    }
}
