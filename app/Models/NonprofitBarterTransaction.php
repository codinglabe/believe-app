<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class NonprofitBarterTransaction extends Model
{
    protected $table = 'nonprofit_barter_transactions';

    protected $fillable = [
        'requesting_nonprofit_id',
        'responding_nonprofit_id',
        'requested_listing_id',
        'return_listing_id',
        'points_delta',
        'status',
        'accepted_at',
        'completed_at',
        'dispute_flag',
    ];

    protected $casts = [
        'points_delta' => 'integer',
        'accepted_at' => 'datetime',
        'completed_at' => 'datetime',
        'dispute_flag' => 'boolean',
    ];

    public const STATUS_PENDING = 'pending';
    public const STATUS_ACCEPTED = 'accepted';
    public const STATUS_IN_FULFILLMENT = 'in_fulfillment';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_CANCELLED = 'cancelled';

    /** Positive delta = requesting (A) pays responding (B). Negative = B pays A. */
    public function requestingNonprofit(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'requesting_nonprofit_id');
    }

    public function respondingNonprofit(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'responding_nonprofit_id');
    }

    public function requestedListing(): BelongsTo
    {
        return $this->belongsTo(NonprofitBarterListing::class, 'requested_listing_id');
    }

    public function returnListing(): BelongsTo
    {
        return $this->belongsTo(NonprofitBarterListing::class, 'return_listing_id');
    }

    public function offers(): HasMany
    {
        return $this->hasMany(NonprofitBarterOffer::class, 'transaction_id');
    }

    public function settlements(): HasMany
    {
        return $this->hasMany(NonprofitBarterSettlement::class, 'transaction_id');
    }

    public function scopePending($query)
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    public function scopeAccepted($query)
    {
        return $query->where('status', self::STATUS_ACCEPTED);
    }

    public function scopeInFulfillment($query)
    {
        return $query->where('status', self::STATUS_IN_FULFILLMENT);
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', self::STATUS_COMPLETED);
    }
}
