<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class NonprofitBarterListing extends Model
{
    protected $table = 'nonprofit_barter_listings';

    protected $fillable = [
        'nonprofit_id',
        'title',
        'description',
        'image',
        'points_value',
        'barter_allowed',
        'requested_services',
        'status',
    ];

    protected $appends = ['image_url'];

    public function getImageUrlAttribute(): ?string
    {
        if (empty($this->image)) {
            return null;
        }
        return asset('storage/' . $this->image);
    }

    protected $casts = [
        'barter_allowed' => 'boolean',
        'requested_services' => 'array',
    ];

    public const STATUS_ACTIVE = 'active';
    public const STATUS_PAUSED = 'paused';
    public const STATUS_COMPLETED = 'completed';

    public function nonprofit(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'nonprofit_id');
    }

    public function requestedInTransactions(): HasMany
    {
        return $this->hasMany(NonprofitBarterTransaction::class, 'requested_listing_id');
    }

    public function returnInTransactions(): HasMany
    {
        return $this->hasMany(NonprofitBarterTransaction::class, 'return_listing_id');
    }

    public function scopeActive($query)
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }
}
