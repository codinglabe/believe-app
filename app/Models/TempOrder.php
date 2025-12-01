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
        'donation_amount',
        'shipping_cost',
        'tax_amount',
        'total_amount',
        'shipping_methods',
        'selected_shipping_method',
        'status',
    ];

    protected $casts = [
        'shipping_methods' => 'array',
        'subtotal' => 'float',
        'platform_fee' => 'float',
        'donation_amount' => 'float',
        'shipping_cost' => 'float',
        'tax_amount' => 'float',
        'total_amount' => 'float',
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
