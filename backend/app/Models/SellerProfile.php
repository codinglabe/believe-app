<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SellerProfile extends Model
{
    use HasFactory;

    protected $fillable = [
        'livestock_user_id',
        'farm_name',
        'address',
        'description',
        'phone',
        'national_id_number',
        'payee_type',
        'payee_details',
        'verification_status',
        'rejection_reason',
    ];

    protected $casts = [
        'payee_details' => 'array',
    ];

    /**
     * Get the livestock user that owns the seller profile.
     */
    public function livestockUser(): BelongsTo
    {
        return $this->belongsTo(LivestockUser::class, 'livestock_user_id');
    }

    /**
     * Check if seller is verified.
     */
    public function isVerified(): bool
    {
        return $this->verification_status === 'verified';
    }
}
