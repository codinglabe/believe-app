<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BridgeIntegration extends Model
{
    protected $fillable = [
        'integratable_id',
        'integratable_type',
        'bridge_customer_id',
        'bridge_wallet_id',
        'kyc_link_id',
        'kyb_link_id',
        'kyc_status',
        'kyb_status',
        'kyc_link_url',
        'kyb_link_url',
        'tos_link_url',
        'tos_status',
        'bridge_metadata',
    ];

    protected $casts = [
        'bridge_metadata' => 'array',
    ];

    protected $appends = [
        'user',
        'organization',
    ];

    /**
     * Get the parent integratable model (User or Organization).
     */
    public function integratable(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Get the user if integratable is a User
     */
    public function getUserAttribute()
    {
        if ($this->integratable_type === User::class) {
            return $this->integratable;
        }
        return null;
    }

    /**
     * Get the organization if integratable is an Organization
     */
    public function getOrganizationAttribute()
    {
        if ($this->integratable_type === Organization::class) {
            return $this->integratable;
        }
        return null;
    }

    /**
     * Check if KYC is approved
     */
    public function isKYCApproved(): bool
    {
        return $this->kyc_status === 'approved';
    }

    /**
     * Check if KYB is approved
     */
    public function isKYBApproved(): bool
    {
        return $this->kyb_status === 'approved';
    }

    /**
     * Check if user can perform transactions (needs KYC/KYB approval)
     */
    public function canTransact(): bool
    {
        // For organizations, need KYB approval
        if ($this->integratable_type === Organization::class) {
            return $this->isKYBApproved();
        }
        
        // For users, need KYC approval
        return $this->isKYCApproved();
    }

    /**
     * Get all KYC/KYB submissions for this integration
     */
    public function submissions(): HasMany
    {
        return $this->hasMany(BridgeKycKybSubmission::class);
    }

    /**
     * Get the latest KYC/KYB submission
     */
    public function latestSubmission()
    {
        return $this->hasOne(BridgeKycKybSubmission::class)->latestOfMany();
    }

    /**
     * Get all wallets for this integration
     */
    public function wallets(): HasMany
    {
        return $this->hasMany(BridgeWallet::class);
    }

    /**
     * Get the primary wallet
     */
    public function primaryWallet()
    {
        return $this->hasOne(BridgeWallet::class)->where('is_primary', true);
    }
}
