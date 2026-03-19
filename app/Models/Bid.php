<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Bid extends Model
{
    protected $fillable = [
        'product_id',
        'user_id',
        'bid_amount',
        'status',
        'submitted_at',
        'city',
        'state',
        'address_line1',
        'address_line2',
        'zip',
        'country',
        'shippo_rate_object_id',
        'shippo_shipping_cost',
        'shippo_tax_amount',
        'shippo_carrier',
        'shippo_currency',
    ];

    public function getLocationDisplayAttribute(): string
    {
        $parts = array_filter([$this->city, $this->state]);
        return $parts ? implode(', ', $parts) : '';
    }

    protected $casts = [
        'bid_amount' => 'decimal:2',
        'submitted_at' => 'datetime',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
