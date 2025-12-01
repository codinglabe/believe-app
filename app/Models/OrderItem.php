<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderItem extends Model
{
    protected $fillable = [
        'order_id',
        'product_id',
        'organization_id',
        'per_organization_donation_amount',
        'quantity',
        'unit_price',
        'subtotal',
        'printify_product_id',
        'printify_variant_id',
        'printify_blueprint_id',
        'printify_print_provider_id',
        'printify_line_item_id',
        'product_details',
        'primary_image',
        'variant_data',
        'printify_synced',
    ];

    protected $casts = [
        'product_details' => 'json',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
