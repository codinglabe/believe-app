<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MarketplaceProduct extends Model
{
    protected $fillable = [
        'merchant_id',
        'name',
        'description',
        'category',
        'base_price',
        'cost',
        'inventory_quantity',
        'product_type',
        'images',
        'fulfillment_shipping_by',
        'digital_delivery_notes',
        'nonprofit_marketplace_enabled',
        'pct_nonprofit',
        'pct_merchant',
        'pct_biu',
        'min_resale_price',
        'suggested_retail_price',
        'nonprofit_approval_type',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'base_price' => 'decimal:2',
            'cost' => 'decimal:2',
            'min_resale_price' => 'decimal:2',
            'suggested_retail_price' => 'decimal:2',
            'pct_nonprofit' => 'decimal:2',
            'pct_merchant' => 'decimal:2',
            'pct_biu' => 'decimal:2',
            'nonprofit_marketplace_enabled' => 'boolean',
            'images' => 'array',
        ];
    }

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(Merchant::class);
    }

    public function organizationProducts(): HasMany
    {
        return $this->hasMany(OrganizationProduct::class);
    }

    public function inPool(): bool
    {
        return $this->status === 'active'
            && $this->nonprofit_marketplace_enabled
            && ($this->inventory_quantity === null || $this->inventory_quantity > 0);
    }
}
