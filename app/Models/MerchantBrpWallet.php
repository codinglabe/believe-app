<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MerchantBrpWallet extends Model
{
    protected $fillable = [
        'merchant_id',
        'balance_brp',
        'reserved_brp',
        'spent_brp',
    ];

    protected $casts = [
        'balance_brp' => 'integer',
        'reserved_brp' => 'integer',
        'spent_brp' => 'integer',
    ];

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(Merchant::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(MerchantBrpTransaction::class, 'merchant_id', 'merchant_id');
    }

    /**
     * Available BRP = balance - reserved
     */
    public function getAvailableBrpAttribute(): int
    {
        return $this->balance_brp - $this->reserved_brp;
    }
}
