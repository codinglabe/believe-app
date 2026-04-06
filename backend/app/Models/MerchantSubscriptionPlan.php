<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MerchantSubscriptionPlan extends Model
{
    protected $fillable = [
        'name',
        'frequency',
        'price',
        'stripe_price_id',
        'stripe_product_id',
        'description',
        'is_active',
        'is_popular',
        'sort_order',
        'trial_days',
        'custom_fields',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_popular' => 'boolean',
        'price' => 'decimal:2',
        'sort_order' => 'integer',
        'trial_days' => 'integer',
        'custom_fields' => 'array',
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
