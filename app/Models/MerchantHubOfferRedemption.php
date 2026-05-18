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
        'subtotal_amount',
        'platform_fee_amount',
        'shipping_cost',
        'tax_amount',
        'total_amount',
        'stripe_processing_fee_addon',
        'status',
        'receipt_code',
        'share_token',
        'shipping_name',
        'shipping_line1',
        'shipping_line2',
        'shipping_city',
        'shipping_state',
        'shipping_postal_code',
        'shipping_country',
        'shippo_shipment_id',
        'shippo_rate_object_id',
        'shippo_transaction_id',
        'carrier',
        'tracking_number',
        'tracking_url',
        'label_url',
        'shipping_status',
        'shipped_at',
        'used_at',
        'verified_by_merchant_id',
        'eligible_item_id',
        'discount_amount',
    ];

    protected $casts = [
        'points_spent' => 'integer',
        'cash_spent' => 'decimal:2',
        'subtotal_amount' => 'decimal:2',
        'platform_fee_amount' => 'decimal:2',
        'shipping_cost' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'stripe_processing_fee_addon' => 'decimal:2',
        'shipped_at' => 'datetime',
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
