<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MerchantHubEligibleItem extends Model
{
    protected $table = 'merchant_hub_eligible_items';

    protected $fillable = [
        'merchant_hub_merchant_id',
        'item_name',
        'description',
        'price',
        'quantity_limit',
        'discount_cap',
        'is_active',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'quantity_limit' => 'integer',
        'discount_cap' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    /**
     * Get the merchant for this eligible item.
     */
    public function merchant(): BelongsTo
    {
        return $this->belongsTo(MerchantHubMerchant::class, 'merchant_hub_merchant_id');
    }

    /**
     * Get the redemptions for this eligible item.
     */
    public function redemptions(): HasMany
    {
        return $this->hasMany(MerchantHubOfferRedemption::class, 'eligible_item_id');
    }

    /**
     * Check if item has reached its quantity limit.
     */
    public function hasReachedLimit(): bool
    {
        if ($this->quantity_limit === null) {
            return false;
        }

        $redeemed = $this->redemptions()
            ->where('status', '!=', 'canceled')
            ->whereNotNull('used_at')
            ->count();

        return $redeemed >= $this->quantity_limit;
    }
}
