<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CartItem extends Model
{
    protected $fillable = ['cart_id', 'product_id', 'organization_product_id', 'quantity', 'unit_price', 'printify_variant_id', 'printify_blueprint_id', 'printify_print_provider_id', 'variant_options', 'variant_price_modifier', 'variant_image'];

    public function cart(): BelongsTo
    {
        return $this->belongsTo(Cart::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function organizationProduct(): BelongsTo
    {
        return $this->belongsTo(OrganizationProduct::class);
    }

    public function isPooledListing(): bool
    {
        return $this->organization_product_id !== null;
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    /**
     * Get variant image URL
     */
    public function getVariantImageUrlAttribute()
    {
        if ($this->variant_image) {
            return $this->variant_image;
        }

        if ($this->product_id && $this->relationLoaded('product') && $this->product) {
            return $this->product->image ?? null;
        }

        return null;
    }
}
