<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LiquidationAddress extends Model
{
    protected $fillable = [
        'bridge_integration_id',
        'bridge_customer_id',
        'bridge_liquidation_address_id',
        'chain',
        'currency',
        'address',
        'destination_payment_rail',
        'destination_currency',
        'destination_address',
        'return_address',
        'state',
        'liquidation_metadata',
        'last_sync_at',
    ];

    protected $casts = [
        'liquidation_metadata' => 'array',
        'last_sync_at' => 'datetime',
    ];

    /**
     * Get the bridge integration that owns this liquidation address
     */
    public function bridgeIntegration(): BelongsTo
    {
        return $this->belongsTo(BridgeIntegration::class);
    }

    /**
     * Scope to get active liquidation addresses
     */
    public function scopeActive($query)
    {
        return $query->where('state', 'active');
    }

    /**
     * Scope to get liquidation addresses by chain
     */
    public function scopeByChain($query, string $chain)
    {
        return $query->where('chain', $chain);
    }

    /**
     * Scope to get liquidation addresses by currency
     */
    public function scopeByCurrency($query, string $currency)
    {
        return $query->where('currency', $currency);
    }

    /**
     * Scope to get liquidation addresses by chain and currency
     */
    public function scopeByChainAndCurrency($query, string $chain, string $currency)
    {
        return $query->where('chain', $chain)->where('currency', $currency);
    }
}
