<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ServiceReview extends Model
{
    protected $fillable = [
        'gig_id',
        'order_id',
        'user_id',
        'reviewer_type',
        'rating',
        'comment',
        'helpful_count',
        'is_verified',
    ];

    protected $casts = [
        'rating' => 'integer',
        'helpful_count' => 'integer',
        'is_verified' => 'boolean',
    ];

    public function gig(): BelongsTo
    {
        return $this->belongsTo(Gig::class, 'gig_id');
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(ServiceOrder::class, 'order_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    protected static function boot()
    {
        parent::boot();

        static::created(function ($review) {
            $review->gig->updateRating();
        });

        static::updated(function ($review) {
            if ($review->wasChanged('rating')) {
                $review->gig->updateRating();
            }
        });

        static::deleted(function ($review) {
            $review->gig->updateRating();
        });
    }
}
