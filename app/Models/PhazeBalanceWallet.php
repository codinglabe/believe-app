<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PhazeBalanceWallet extends Model
{
    public const DEFAULT_SLUG = 'default';

    protected $fillable = [
        'slug',
        'available_balance',
        'total_funded',
        'total_consumed',
        'currency',
    ];

    protected $casts = [
        'available_balance' => 'decimal:2',
        'total_funded' => 'decimal:2',
        'total_consumed' => 'decimal:2',
    ];

    public function ledgerEntries(): HasMany
    {
        return $this->hasMany(PhazeBalanceLedgerEntry::class);
    }
}
