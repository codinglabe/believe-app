<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Casts\Attribute;

class Product extends Model
{
    protected $fillable = [
        'name',
        'description',
        'quantity',
        'unit_price',
        'admin_owned',
        'owned_by',
        'organization_id',
        'status',
        'sku',
        'type',
        'tags',
        'image',
    ];

    /**
     * Get the user that owns the product.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function categories()
    {
        return $this->belongsToMany(Category::class, 'product_associated_categories');
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($product) {
            $product->slug = static::generateUniqueSlug($product->name);
        });
        static::updating(function ($product) {
            if ($product->isDirty('name')) {
                $product->slug = static::generateUniqueSlug($product->name,$product->id);
            }
        });
    }

    protected static function generateUniqueSlug($name,$ignoreId = null)
    {
        $slug = \Str::slug($name);
        $baseSlug = $slug;
        $i = 1;
        while (static::where('slug', $slug)->when($ignoreId, fn($q) => $q->where('id', '!=', $ignoreId))->exists()) {
            $slug = $baseSlug . '-' . $i;
            $i++;
        }
        return $slug;
    }


    /**
     * Get the image URL.
     */
    protected function image(): Attribute
    {
        return Attribute::make(
            get: function ($value) {
                if (!$value) {
                    return null;
                }

                // If it's already a full URL, return as is
                if (filter_var($value, FILTER_VALIDATE_URL)) {
                    return $value;
                }

                // Return the full URL for stored images
                return asset('storage/' . $value);
            }
        );
    }
}

