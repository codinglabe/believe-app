<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BuyerProfile extends Model
{
    use HasFactory;

    protected $fillable = [
        'livestock_user_id',
        'fractional_asset_id',
        'farm_name',
        'address',
        'description',
        'phone',
        'email',
        'city',
        'state',
        'zip_code',
        'country',
        'national_id_number',
        'farm_type',
        'farm_size_acres',
        'number_of_animals',
        'specialization',
        'verification_status',
        'rejection_reason',
    ];

    /**
     * Get the livestock user that owns the buyer profile.
     */
    public function livestockUser(): BelongsTo
    {
        return $this->belongsTo(LivestockUser::class, 'livestock_user_id');
    }

    /**
     * Get the fractional asset linked to this buyer.
     */
    public function fractionalAsset(): BelongsTo
    {
        return $this->belongsTo(FractionalAsset::class, 'fractional_asset_id');
    }

    /**
     * Check if buyer is verified.
     */
    public function isVerified(): bool
    {
        return $this->verification_status === 'verified';
    }
}

