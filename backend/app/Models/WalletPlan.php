<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WalletPlan extends Model
{
    protected $fillable = [
        'name',
        'frequency',
        'price',
        'one_time_fee',
        'stripe_price_id',
        'stripe_product_id',
        'description',
        'trial_days',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'price' => 'decimal:2',
        'one_time_fee' => 'decimal:2',
        'trial_days' => 'integer',
        'sort_order' => 'integer',
    ];

    /**
     * Scope a query to only include active plans.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope a query to order by sort order.
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order')->orderBy('price');
    }

    /**
     * Get the formatted price in dollars.
     */
    public function getFormattedPriceAttribute()
    {
        return number_format($this->price, 2);
    }
}
