<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Casts\Attribute;

class Product extends Model
{
    protected $fillable = [
        'user_id',
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
            $product->slug = static::generateUniqueSlug($product->name, $product->user_id);
        });
        static::updating(function ($product) {
            if ($product->isDirty('name')) {
                $product->slug = static::generateUniqueSlug($product->name, $product->user_id, $product->id);
            }
        });
    }

    protected static function generateUniqueSlug($name, $userId, $ignoreId = null)
    {
        $slug = \Str::slug($name);
        $baseSlug = $slug;
        $i = 1;
        while (static::where('slug', $slug)->where('user_id', $userId)->when($ignoreId, fn($q) => $q->where('id', '!=', $ignoreId))->exists()) {
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

     /**
     * Get the organization that owns the product.
     */
    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function productCategory()
    {
        return $this->hasMany(ProductAssociatedCategory::class, 'product_id');
    }
}

