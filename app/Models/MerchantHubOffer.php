<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;

class MerchantHubOffer extends Model
{
    protected $table = 'merchant_hub_offers';

    protected $fillable = [
        'merchant_hub_merchant_id',
        'merchant_hub_category_id',
        'title',
        'slug',
        'short_description',
        'description',
        'reference_price',
        'image_url',
        'points_required',
        'cash_required',
        'currency',
        'inventory_qty',
        'starts_at',
        'ends_at',
        'status',
        'is_standard_discount',
        'discount_percentage',
        'discount_cap',
    ];

    protected $casts = [
        'reference_price' => 'decimal:2',
        'points_required' => 'integer',
        'cash_required' => 'decimal:2',
        'inventory_qty' => 'integer',
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'is_standard_discount' => 'boolean',
        'discount_percentage' => 'decimal:2',
        'discount_cap' => 'decimal:2',
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
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($offer) {
            if (empty($offer->slug) && !empty($offer->title)) {
                $offer->slug = static::generateUniqueSlug($offer->title);
            }
        });

        static::updating(function ($offer) {
            // Always regenerate slug if title changes or if slug is missing
            if ($offer->isDirty('title') || empty($offer->slug)) {
                $offer->slug = static::generateUniqueSlug($offer->title, $offer->id);
            }
        });
    }

    /**
     * Generate a unique slug for the offer.
     */
    protected static function generateUniqueSlug(string $title, ?int $excludeId = null): string
    {
        if (empty($title)) {
            return '';
        }

        $slug = Str::slug($title);
        if (empty($slug)) {
            // Fallback if slug is empty (e.g., title has only special characters)
            $slug = 'offer-' . ($excludeId ?? time());
        }

        $originalSlug = $slug;
        $counter = 1;

        while (true) {
            $query = static::where('slug', $slug);
            if ($excludeId) {
                $query->where('id', '!=', $excludeId);
            }

            if (!$query->exists()) {
                break;
            }

            $slug = $originalSlug . '-' . $counter;
            $counter++;

            // Safety check to prevent infinite loops
            if ($counter > 1000) {
                $slug = $originalSlug . '-' . time();
                break;
            }
        }

        return $slug;
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

    /**
     * BIU Unity Points: $1 discount = 1,000 points.
     * discount_amount = reference_price * (discount_percentage/100)
     * points_required = discount_amount * 1000
     */
    public function getDiscountAmount(): float
    {
        $price = (float) ($this->reference_price ?? 0);
        $pct = (float) ($this->discount_percentage ?? 0);
        if ($price <= 0 || $pct <= 0) {
            return 0.0;
        }
        $amount = $price * ($pct / 100);
        if ($this->discount_cap !== null && (float) $this->discount_cap > 0 && $amount > (float) $this->discount_cap) {
            return (float) $this->discount_cap;
        }
        return round($amount, 2);
    }

    /**
     * Customer price when using Unity Points (retail minus discount).
     */
    public function getCustomerPriceWithPoints(): float
    {
        $price = (float) ($this->reference_price ?? 0);
        return round($price - $this->getDiscountAmount(), 2);
    }

    /**
     * Cash price when user has no points: full reference price.
     */
    public function getCommunityCashPrice(): float
    {
        $price = (float) ($this->reference_price ?? 0);
        return round($price, 2);
    }

    /**
     * Calculate points required from reference_price and discount_percentage.
     * Points are auto-calculated; merchants cannot edit.
     */
    public static function calculatePointsRequired(float $referencePrice, float $discountPercent, ?float $discountCap = null): int
    {
        if ($referencePrice <= 0 || $discountPercent <= 0) {
            return 0;
        }
        $discountAmount = $referencePrice * ($discountPercent / 100);
        if ($discountCap !== null && $discountCap > 0 && $discountAmount > $discountCap) {
            $discountAmount = $discountCap;
        }
        return (int) round($discountAmount * 1000);
    }
}
