<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PreGeneratedTag extends Model
{
    protected $fillable = [
        'country_code',
        'tag_number',
        'fractional_asset_id',
        'livestock_animal_id',
        'status',
    ];

    protected $casts = [
        'status' => 'string',
    ];

    /**
     * Get the fractional asset.
     */
    public function fractionalAsset(): BelongsTo
    {
        return $this->belongsTo(FractionalAsset::class, 'fractional_asset_id');
    }

    /**
     * Get the livestock animal.
     */
    public function animal(): BelongsTo
    {
        return $this->belongsTo(LivestockAnimal::class, 'livestock_animal_id');
    }

    /**
     * Check if tag is available.
     */
    public function isAvailable(): bool
    {
        return $this->status === 'available';
    }

    /**
     * Check if tag is assigned.
     */
    public function isAssigned(): bool
    {
        return $this->status === 'assigned';
    }
}
