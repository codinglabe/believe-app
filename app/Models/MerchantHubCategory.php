<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MerchantHubCategory extends Model
{
    protected $table = 'merchant_hub_categories';

    protected $fillable = [
        'name',
        'slug',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    /**
     * Get the offers for this category.
     */
    public function offers(): HasMany
    {
        return $this->hasMany(MerchantHubOffer::class, 'merchant_hub_category_id');
    }

    /**
     * Get active offers count for this category.
     */
    public function getActiveOffersCountAttribute(): int
    {
        return $this->offers()
            ->where('status', 'active')
            ->where(function ($query) {
                $query->whereNull('starts_at')
                    ->orWhere('starts_at', '<=', now());
            })
            ->where(function ($query) {
                $query->whereNull('ends_at')
                    ->orWhere('ends_at', '>=', now());
            })
            ->count();
    }
}
