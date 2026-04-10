<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TempOrder extends Model
{
    protected $fillable = [
        'user_id',
        'cart_id',
        'printify_order_id',
        'first_name',
        'last_name',
        'email',
        'phone',
        'shipping_address',
        'city',
        'state',
        'zip',
        'country',
        'subtotal',
        'platform_fee',
        'organization_markup_basis',
        'donation_amount',
        'shipping_cost',
        'tax_amount',
        'printify_tax_amount',
        'additional_sales_tax_adjustment',
        'total_amount',
        'shipping_methods',
        'selected_shipping_method',
        'shippo_rate_object_id',
        'shippo_carrier',
        'shippo_shipment_id',
        'shippo_rate_amount',
        'status',
    ];

    protected $casts = [
        'shipping_methods' => 'array',
        'subtotal' => 'float',
        'platform_fee' => 'float',
        'organization_markup_basis' => 'float',
        'donation_amount' => 'float',
        'shipping_cost' => 'float',
        'tax_amount' => 'float',
        'printify_tax_amount' => 'float',
        'additional_sales_tax_adjustment' => 'float',
        'total_amount' => 'float',
        'shippo_rate_amount' => 'float',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function cart()
    {
        return $this->belongsTo(Cart::class);
    }

    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class, 'temp_order_id');
    }
}
