<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NonprofitBarterOffer extends Model
{
    protected $table = 'nonprofit_barter_offers';

    protected $fillable = [
        'transaction_id',
        'proposer_nonprofit_id',
        'proposed_return_listing_id',
        'proposed_points_delta',
        'message',
        'status',
    ];

    protected $casts = [
        'proposed_points_delta' => 'integer',
    ];

    public const STATUS_PENDING = 'pending';
    public const STATUS_ACCEPTED = 'accepted';
    public const STATUS_REJECTED = 'rejected';

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(NonprofitBarterTransaction::class);
    }

    public function proposerNonprofit(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'proposer_nonprofit_id');
    }

    public function proposedReturnListing(): BelongsTo
    {
        return $this->belongsTo(NonprofitBarterListing::class, 'proposed_return_listing_id');
    }
}
