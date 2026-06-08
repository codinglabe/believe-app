<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

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
     * Find or create the integration row for an entity, reusing an existing Bridge customer when present.
     */
    public static function resolveForEntity(
        int $integratableId,
        string $integratableType,
        ?string $bridgeCustomerId = null,
        ?string $kycLinkId = null,
    ): self {
        $byEntity = static::where('integratable_id', $integratableId)
            ->where('integratable_type', $integratableType)
            ->first();

        $byCustomer = $bridgeCustomerId
            ? static::where('bridge_customer_id', $bridgeCustomerId)->first()
            : null;

        $byKycLink = $kycLinkId
            ? static::where('kyc_link_id', $kycLinkId)->first()
            : null;

        // Prefer the canonical Bridge customer row when Bridge returns an existing customer_id.
        $integration = $byCustomer ?? $byKycLink ?? $byEntity;

        if (! $integration) {
            $integration = new static();
        } elseif (
            $integration->integratable_id !== $integratableId
            || $integration->integratable_type !== $integratableType
        ) {
            Log::info('BridgeIntegration: re-linked existing Bridge customer to current entity', [
                'integration_id' => $integration->id,
                'bridge_customer_id' => $bridgeCustomerId,
                'from_integratable_id' => $integration->integratable_id,
                'from_integratable_type' => $integration->integratable_type,
                'to_integratable_id' => $integratableId,
                'to_integratable_type' => $integratableType,
            ]);
        }

        if (
            $byEntity
            && $integration->id
            && $byEntity->id !== $integration->id
            && empty($byEntity->bridge_customer_id)
        ) {
            Log::info('BridgeIntegration: removing orphan integration stub', [
                'stub_id' => $byEntity->id,
                'kept_integration_id' => $integration->id,
            ]);
            $byEntity->delete();
        }

        $integration->integratable_id = $integratableId;
        $integration->integratable_type = $integratableType;

        return $integration;
    }

    /**
     * Get the parent integratable model (User or Organization).
     */
    public function integratable(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Get the card wallets for this integration
     */
    public function cardWallets(): HasMany
    {
        return $this->hasMany(CardWallet::class);
    }

    /**
     * Get the primary card wallet
     */
    public function primaryCardWallet()
    {
        return $this->hasOne(CardWallet::class)->where('is_primary', true);
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

    /**
     * Get all liquidation addresses for this integration
     */
    public function liquidationAddresses(): HasMany
    {
        return $this->hasMany(LiquidationAddress::class);
    }
}
