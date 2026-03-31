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
        'category_id',
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

    /**
     * Named productCategory so it does not collide with a legacy `category` string column on the same table.
     */
    public function productCategory(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'category_id');
    }

    public function organizationProducts(): HasMany
    {
        return $this->hasMany(OrganizationProduct::class);
    }

    /**
     * Nonprofit pool tab / org adoption: active, nonprofit enabled, in stock.
     */
    public function inPool(): bool
    {
        return $this->status === 'active'
            && $this->nonprofit_marketplace_enabled
            && ($this->inventory_quantity === null || $this->inventory_quantity > 0);
    }

    /**
     * Merchant Hub checkout (supporter cart): active and in stock — independent of nonprofit pool opt-in.
     */
    public function isHubCheckoutEligible(): bool
    {
        if ($this->status !== 'active') {
            return false;
        }

        return $this->inventory_quantity === null || (int) $this->inventory_quantity > 0;
    }
}
