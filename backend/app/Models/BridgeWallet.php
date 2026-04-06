<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BridgeWallet extends Model
{
    protected $fillable = [
        'bridge_integration_id',
        'bridge_customer_id',
        'bridge_wallet_id',
        'wallet_address',
        'chain',
        'status',
        'balance',
        'currency',
        'virtual_account_id',
        'virtual_account_details',
        'wallet_metadata',
        'last_balance_sync',
        'is_primary',
    ];

    protected $casts = [
        'wallet_metadata' => 'array',
        'virtual_account_details' => 'array',
        'balance' => 'decimal:8',
        'is_primary' => 'boolean',
        'last_balance_sync' => 'datetime',
    ];

    /**
     * Get the bridge integration that owns this wallet
     */
    public function bridgeIntegration(): BelongsTo
    {
        return $this->belongsTo(BridgeIntegration::class);
    }

    /**
     * Scope to get primary wallet
     */
    public function scopePrimary($query)
    {
        return $query->where('is_primary', true);
    }

    /**
     * Scope to get active wallets
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope to get wallets by chain
     */
    public function scopeByChain($query, string $chain)
    {
        return $query->where('chain', $chain);
    }
}
