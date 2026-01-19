<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MerchantHubMerchant extends Model
{
    protected $table = 'merchant_hub_merchants';

    protected $fillable = [
        'name',
        'slug',
        'logo_url',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    /**
     * Get the offers for this merchant.
     */
    public function offers(): HasMany
    {
        return $this->hasMany(MerchantHubOffer::class, 'merchant_hub_merchant_id');
    }

    /**
     * Get the eligible items for this merchant.
     */
    public function eligibleItems(): HasMany
    {
        return $this->hasMany(MerchantHubEligibleItem::class, 'merchant_hub_merchant_id');
    }
}
