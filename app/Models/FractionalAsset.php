<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FractionalAsset extends Model
{
    use HasFactory;

    protected $fillable = [
        'type',
        'name',
        'symbol',
        'description',
        'media',
        'meta',
    ];

    protected $casts = [
        'media' => 'array',
        'meta' => 'array',
    ];

    public function offerings(): HasMany
    {
        return $this->hasMany(FractionalOffering::class, 'asset_id');
    }

    /**
     * Check if this asset is a livestock/animal asset (requires tag number from fractional_listing)
     */
    public function isLivestockAsset(): bool
    {
        $assetType = strtolower($this->type ?? '');
        return in_array($assetType, ['goat', 'livestock', 'livestock_goat']);
    }

    /**
     * Alias for backward compatibility
     */
    public function isGoatAsset(): bool
    {
        return $this->isLivestockAsset();
    }

    /**
     * Get the fractional listing for this livestock asset
     */
    public function fractionalListing()
    {
        return $this->hasOne(\App\Models\FractionalListing::class, 'fractional_asset_id')
            ->where('status', 'active');
    }
}



