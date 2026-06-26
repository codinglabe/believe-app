<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BelievePointReserveSettlementCredit extends Model
{
    protected $fillable = [
        'amount',
        'allocated_amount',
        'bridge_transfer_id',
        'bridge_activity_id',
        'bridge_wallet_id',
        'bridge_customer_id',
        'bridge_state',
        'source_type',
        'metadata',
        'credited_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'allocated_amount' => 'decimal:2',
        'metadata' => 'array',
        'credited_at' => 'datetime',
    ];

    public function allocations(): HasMany
    {
        return $this->hasMany(BelievePointReserveSettlementAllocation::class);
    }

    public function remainingAmount(): float
    {
        return round(max(0, (float) $this->amount - (float) $this->allocated_amount), 2);
    }
}
