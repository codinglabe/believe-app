<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmailPackage extends Model
{
    protected $fillable = [
        'name',
        'description',
        'emails_count',
        'price',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'emails_count' => 'integer',
        'price' => 'decimal:2',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    /**
     * Scope to get only active packages
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to order by sort_order
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order')->orderBy('price');
    }
}
