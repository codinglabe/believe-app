<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Plan extends Model
{
    protected $fillable = [
        'organization_id',
        'name',
        'frequency',
        'price',
        'stripe_price_id',
        'stripe_product_id',
        'description',
        'is_active',
    ];

    /**
     * Get the formatted price in dollars.
     *
     * @return string
     */
    public function getFormattedPriceAttribute()
    {
        return number_format($this->price / 100, 2);
    }

    /**
     * Get the frequency in a user-friendly format.
     *
     * @return string
     */
    public function getFrequencyAttribute()
    {
        return match ($this->freequency) {
            'one-time' => 'One Time',
            'weekly' => 'Weekly',
            'monthly' => 'Monthly',
            'yearly' => 'Yearly',
            default => ucfirst($this->freequency),
        };
    }

    /**
     * Scope a query to only include active plans.
     *
     * @param \Illuminate\Database\Eloquent\Builder $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
