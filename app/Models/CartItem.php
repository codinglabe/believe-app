<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CartItem extends Model
{
    protected $fillable = ['cart_id', 'product_id', 'quantity', 'unit_price', 'printify_variant_id','printify_blueprint_id', 'printify_print_provider_id', 'variant_options', 'variant_price_modifier', 'variant_image'];

    public function cart(): BelongsTo
    {
        return $this->belongsTo(Cart::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
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

        // Fallback to product image
        return $this->product->image ?? null;
    }
}
