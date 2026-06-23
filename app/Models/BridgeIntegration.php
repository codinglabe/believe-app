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
     * Find the Bridge integration for a logged-in user (org + user rows).
     */
    public static function resolveForUser(User $user): ?self
    {
        $candidates = [];
        $seen = [];

        $add = function (?int $id, ?string $type) use (&$candidates, &$seen): void {
            if ($id === null || $type === null) {
                return;
            }

            $key = $type.'#'.$id;
            if (isset($seen[$key])) {
                return;
            }

            $seen[$key] = true;
            $candidates[] = [$id, $type];
        };

        if (in_array($user->role, ['organization', 'organization_pending'], true)) {
            $add(Organization::forAuthUser($user)?->id, Organization::class);
            $add($user->organization?->id, Organization::class);

            foreach (Organization::where('user_id', $user->id)->pluck('id') as $orgId) {
                $add((int) $orgId, Organization::class);
            }

            foreach ($user->boardMemberships()->pluck('organization_id') as $orgId) {
                $add((int) $orgId, Organization::class);
            }
        }

        $add($user->id, User::class);

        foreach ($candidates as [$id, $type]) {
            $integration = static::with(['primaryWallet', 'wallets'])
                ->where('integratable_id', $id)
                ->where('integratable_type', $type)
                ->whereNotNull('bridge_customer_id')
                ->where('bridge_customer_id', '!=', '')
                ->first();

            if ($integration !== null) {
                return $integration;
            }
        }

        foreach ($candidates as [$id, $type]) {
            $integration = static::with(['primaryWallet', 'wallets'])
                ->where('integratable_id', $id)
                ->where('integratable_type', $type)
                ->first();

            if ($integration !== null) {
                return $integration;
            }
        }

        return null;
    }

    /**
     * Resolve Bridge integration for the logged-in user, preferring the canonical
     * organization entity (owner or board-linked) for business accounts — same
     * entity BridgeWalletController uses for status, balance, and KYB.
     */
    public static function resolveForAuthUser(User $user): ?self
    {
        $isOrgUser = in_array($user->role, ['organization', 'organization_pending'], true);

        if ($isOrgUser) {
            $organization = Organization::forAuthUser($user);
            if ($organization) {
                $orgIntegration = static::with(['primaryWallet', 'wallets'])
                    ->where('integratable_id', $organization->id)
                    ->where('integratable_type', Organization::class)
                    ->first();

                if ($orgIntegration !== null) {
                    return $orgIntegration;
                }
            }
        }

        return static::resolveForUser($user);
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
     * Bridge ToS DB values: pending, approved (legacy code may still say "accepted").
     */
    public static function normalizeTosStatus(?string $status): string
    {
        $status = strtolower(trim((string) $status));

        if (in_array($status, ['approved', 'accepted'], true)) {
            return 'approved';
        }

        return 'pending';
    }

    public static function isTosAccepted(?string $status): bool
    {
        return in_array(strtolower(trim((string) $status)), ['approved', 'accepted'], true);
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
     * Integrations that can receive wallet sends (verified + wallet/VA on file).
     */
    public function scopeEligibleSendRecipient($query)
    {
        return $query
            ->whereNotNull('bridge_customer_id')
            ->where('bridge_customer_id', '!=', '')
            ->where(function ($q) {
                $q->where(function ($userQ) {
                    $userQ->where('integratable_type', User::class)
                        ->where('kyc_status', 'approved');
                })->orWhere(function ($orgQ) {
                    $orgQ->where('integratable_type', Organization::class)
                        ->where('kyb_status', 'approved');
                });
            })
            ->where(function ($q) {
                $q->where(function ($idQ) {
                    $idQ->whereNotNull('bridge_wallet_id')
                        ->where('bridge_wallet_id', '!=', '');
                })->orWhereHas('wallets', function ($w) {
                    $w->where(function ($wq) {
                        $wq->where(function ($bw) {
                            $bw->whereNotNull('bridge_wallet_id')
                                ->where('bridge_wallet_id', '!=', '');
                        })->orWhere(function ($va) {
                            $va->whereNotNull('virtual_account_id')
                                ->where('virtual_account_id', '!=', '');
                        })->orWhere(function ($addr) {
                            $addr->whereNotNull('wallet_address')
                                ->where('wallet_address', '!=', '');
                        });
                    });
                });
            });
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
