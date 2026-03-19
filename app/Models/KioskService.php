<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KioskService extends Model
{
    protected $table = 'kiosk_services';

    protected $fillable = [
        'market_code',
        'state',
        'parish',
        'city',
        'category_slug',
        'subcategory',
        'service_slug',
        'display_name',
        'url',
        'launch_type',
        'jurisdiction_level',
        'jurisdiction_rank',
        'category_sort',
        'item_sort_within_category',
        'is_active',
        'allow_webview',
        'enable_redirect_tracking',
        'internal_product',
        'notes',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'allow_webview' => 'boolean',
        'enable_redirect_tracking' => 'boolean',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(KioskCategory::class, 'category_slug', 'slug');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeInCategory($query, ?string $slug)
    {
        if ($slug !== null && $slug !== '') {
            return $query->where('category_slug', $slug);
        }

        return $query;
    }

    public function scopeInState($query, ?string $state)
    {
        if ($state !== null && $state !== '') {
            return $query->where('state', $state);
        }

        return $query;
    }

    public function scopeInCity($query, ?string $city)
    {
        if ($city !== null && $city !== '') {
            return $query->where('city', $city);
        }

        return $query;
    }

    public function scopeSubcategory($query, ?string $subcategory)
    {
        if ($subcategory !== null && $subcategory !== '') {
            return $query->where('subcategory', $subcategory);
        }

        return $query;
    }

    public function scopeSearch($query, ?string $term)
    {
        if ($term === null || trim($term) === '') {
            return $query;
        }

        $term = trim($term);
        return $query->where(function ($q) use ($term) {
            $q->where('display_name', 'like', '%'.$term.'%')
                ->orWhere('subcategory', 'like', '%'.$term.'%')
                ->orWhere('category_slug', 'like', '%'.$term.'%');
        });
    }
}
