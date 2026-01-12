<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MerchantHubOfferRedemption extends Model
{
    protected $table = 'merchant_hub_offer_redemptions';

    protected $fillable = [
        'merchant_hub_offer_id',
        'user_id',
        'points_spent',
        'cash_spent',
        'status',
        'receipt_code',
    ];

    protected $casts = [
        'points_spent' => 'integer',
        'cash_spent' => 'decimal:2',
    ];

    /**
     * Get the offer for this redemption.
     */
    public function offer(): BelongsTo
    {
        return $this->belongsTo(MerchantHubOffer::class, 'merchant_hub_offer_id');
    }

    /**
     * Get the user for this redemption.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
