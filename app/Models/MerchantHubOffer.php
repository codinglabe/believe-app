<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;

class MerchantHubOffer extends Model
{
    protected $table = 'merchant_hub_offers';

    protected $fillable = [
        'merchant_hub_merchant_id',
        'merchant_hub_category_id',
        'title',
        'short_description',
        'description',
        'image_url',
        'points_required',
        'cash_required',
        'currency',
        'inventory_qty',
        'starts_at',
        'ends_at',
        'status',
    ];

    protected $casts = [
        'points_required' => 'integer',
        'cash_required' => 'decimal:2',
        'inventory_qty' => 'integer',
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
    ];

    /**
     * Get the merchant for this offer.
     */
    public function merchant(): BelongsTo
    {
        return $this->belongsTo(MerchantHubMerchant::class, 'merchant_hub_merchant_id');
    }

    /**
     * Get the category for this offer.
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(MerchantHubCategory::class, 'merchant_hub_category_id');
    }

    /**
     * Get the redemptions for this offer.
     */
    public function redemptions(): HasMany
    {
        return $this->hasMany(MerchantHubOfferRedemption::class, 'merchant_hub_offer_id');
    }

    /**
     * Scope a query to only include active offers.
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'active')
            ->where(function ($q) {
                $q->whereNull('starts_at')
                    ->orWhere('starts_at', '<=', now());
            })
            ->where(function ($q) {
                $q->whereNull('ends_at')
                    ->orWhere('ends_at', '>=', now());
            });
    }

    /**
     * Scope a query to only include offers with available inventory.
     */
    public function scopeWithAvailableInventory(Builder $query): Builder
    {
        return $query->where(function ($q) {
            $q->whereNull('inventory_qty')
                ->orWhereRaw('inventory_qty > (
                    SELECT COUNT(*)
                    FROM merchant_hub_offer_redemptions
                    WHERE merchant_hub_offer_id = merchant_hub_offers.id
                    AND status != "canceled"
                )');
        });
    }

    /**
     * Check if offer is currently available.
     */
    public function isAvailable(): bool
    {
        if ($this->status !== 'active') {
            return false;
        }

        if ($this->starts_at && $this->starts_at->isFuture()) {
            return false;
        }

        if ($this->ends_at && $this->ends_at->isPast()) {
            return false;
        }

        if ($this->inventory_qty !== null) {
            $redeemed = $this->redemptions()
                ->where('status', '!=', 'canceled')
                ->count();
            if ($redeemed >= $this->inventory_qty) {
                return false;
            }
        }

        return true;
    }
}
