<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KioskCategory extends Model
{
    protected $fillable = ['slug', 'title', 'keywords', 'redirect_url', 'sort_order', 'is_active'];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public static function slugsInOrder(): array
    {
        return [
            'pay-bills',
            'healthcare',
            'government',
            'find-a-job',
            'financial',
            'community-help',
            'housing-assistance',
            'education',
            'veteran-services',
            'food-and-family',
            'transportation',
            'disaster-and-legal',
        ];
    }
}
