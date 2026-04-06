<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CardWallet extends Model
{
    protected $fillable = [
        'bridge_integration_id',
        'bridge_customer_id',
        'bridge_card_account_id',
        'card_number',
        'card_type',
        'card_brand',
        'expiry_month',
        'expiry_year',
        'status',
        'balance',
        'currency',
        'card_metadata',
        'last_balance_sync',
        'is_primary',
    ];

    protected $casts = [
        'card_metadata' => 'array',
        'balance' => 'decimal:8',
        'is_primary' => 'boolean',
        'last_balance_sync' => 'datetime',
    ];

    /**
     * Get the bridge integration that owns this card wallet
     */
    public function bridgeIntegration(): BelongsTo
    {
        return $this->belongsTo(BridgeIntegration::class);
    }

    /**
     * Scope to get primary card wallet
     */
    public function scopePrimary($query)
    {
        return $query->where('is_primary', true);
    }

    /**
     * Scope to get active card wallets
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope to get card wallets by status
     */
    public function scopeByStatus($query, string $status)
    {
        return $query->where('status', $status);
    }
}
