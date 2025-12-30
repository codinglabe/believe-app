<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Gig extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'category_id',
        'title',
        'slug',
        'description',
        'full_description',
        'price',
        'delivery_time',
        'rating',
        'reviews_count',
        'orders_count',
        'tags',
        'faqs',
        'status',
        'is_featured',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'rating' => 'decimal:2',
        'tags' => 'array',
        'faqs' => 'array',
        'is_featured' => 'boolean',
        'reviews_count' => 'integer',
        'orders_count' => 'integer',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($gig) {
            if (empty($gig->slug)) {
                $gig->slug = Str::slug($gig->title);
                // Ensure uniqueness
                $originalSlug = $gig->slug;
                $counter = 1;
                while (static::where('slug', $gig->slug)->exists()) {
                    $gig->slug = $originalSlug . '-' . $counter;
                    $counter++;
                }
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(ServiceCategory::class, 'category_id');
    }

    public function packages(): HasMany
    {
        return $this->hasMany(GigPackage::class, 'gig_id')->orderBy('sort_order');
    }

    public function images(): HasMany
    {
        return $this->hasMany(GigImage::class, 'gig_id')->orderBy('sort_order');
    }

    public function primaryImage(): HasMany
    {
        return $this->hasMany(GigImage::class, 'gig_id')->where('is_primary', true);
    }

    public function favorites(): HasMany
    {
        return $this->hasMany(GigFavorite::class, 'gig_id');
    }

    public function orders(): HasMany
    {
        return $this->hasMany(ServiceOrder::class, 'gig_id');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(ServiceReview::class, 'gig_id');
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeFeatured($query)
    {
        return $query->where('is_featured', true);
    }

    public function updateRating()
    {
        // Only count buyer reviews for rating and count
        $buyerReviews = $this->reviews()->where('reviewer_type', 'buyer');
        $avgRating = $buyerReviews->avg('rating');
        $this->update([
            'rating' => round($avgRating ?? 0, 2),
            'reviews_count' => $buyerReviews->count(),
        ]);
    }
}
