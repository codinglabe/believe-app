<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FractionalListing extends Model
{
    use HasFactory;

    protected $fillable = [
        'livestock_animal_id',
        'livestock_user_id',
        'fractional_asset_id',
        'country_code',
        'tag_number',
        'status',
        'notes',
    ];

    /**
     * Get the livestock animal.
     */
    public function animal(): BelongsTo
    {
        return $this->belongsTo(LivestockAnimal::class, 'livestock_animal_id');
    }

    /**
     * Get the livestock user (owner).
     */
    public function livestockUser(): BelongsTo
    {
        return $this->belongsTo(LivestockUser::class, 'livestock_user_id');
    }

    /**
     * Get the fractional asset.
     */
    public function fractionalAsset(): BelongsTo
    {
        return $this->belongsTo(FractionalAsset::class, 'fractional_asset_id');
    }

    /**
     * Check if listing is active.
     */
    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    /**
     * Check if listing is pending.
     */
    public function isPending(): bool
    {
        return $this->status === 'pending';
    }
}
