<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FractionalOffering extends Model
{
    use HasFactory;

    protected $fillable = [
        'asset_id',
        'title',
        'summary',
        'total_shares',
        'available_shares',
        'price_per_share',
        'token_price',
        'ownership_percentage',
        'currency',
        'status',
        'go_live_at',
        'close_at',
        'meta',
    ];

    protected $casts = [
        'meta' => 'array',
        'go_live_at' => 'datetime',
        'close_at' => 'datetime',
    ];

    public function asset(): BelongsTo
    {
        return $this->belongsTo(FractionalAsset::class, 'asset_id');
    }

    public function orders(): HasMany
    {
        return $this->hasMany(FractionalOrder::class, 'offering_id');
    }

    public function holdings(): HasMany
    {
        return $this->hasMany(FractionalHolding::class, 'offering_id');
    }

    public function shareTags(): HasMany
    {
        return $this->hasMany(FractionalShareTag::class, 'offering_id');
    }

    /**
     * Calculate tokens per share
     */
    public function getTokensPerShareAttribute(): int
    {
        if (!$this->token_price || $this->token_price == 0) {
            return 0;
        }
        return (int) floor($this->price_per_share / $this->token_price);
    }

    /**
     * Calculate ownership percentage per token
     */
    public function calculateOwnershipPercentage(): float
    {
        if (!$this->price_per_share || $this->price_per_share == 0) {
            return 0;
        }
        return ($this->token_price / $this->price_per_share) * 100;
    }
}


