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
        'used_at',
        'verified_by_merchant_id',
        'eligible_item_id',
        'discount_amount',
    ];

    protected $casts = [
        'points_spent' => 'integer',
        'cash_spent' => 'decimal:2',
        'used_at' => 'datetime',
        'discount_amount' => 'decimal:2',
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

    /**
     * Get the merchant who verified this redemption.
     */
    public function verifiedByMerchant(): BelongsTo
    {
        return $this->belongsTo(Merchant::class, 'verified_by_merchant_id');
    }

    /**
     * Get the eligible item that was redeemed.
     */
    public function eligibleItem(): BelongsTo
    {
        return $this->belongsTo(MerchantHubEligibleItem::class, 'eligible_item_id');
    }

    /**
     * Check if redemption has been used.
     */
    public function isUsed(): bool
    {
        return $this->status === 'fulfilled' && $this->used_at !== null;
    }
}
