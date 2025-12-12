<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

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
        'bridge_metadata',
    ];

    protected $casts = [
        'bridge_metadata' => 'array',
    ];

    /**
     * Get the parent integratable model (User or Organization).
     */
    public function integratable(): MorphTo
    {
        return $this->morphTo();
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
}
