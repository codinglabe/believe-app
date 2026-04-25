<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OrganizationBrpWallet extends Model
{
    protected $fillable = [
        'organization_id',
        'balance_brp',
        'reserved_brp',
        'spent_brp',
    ];

    protected $casts = [
        'balance_brp' => 'integer',
        'reserved_brp' => 'integer',
        'spent_brp' => 'integer',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(OrganizationBrpTransaction::class, 'organization_id', 'organization_id');
    }

    /**
     * Available BRP = balance - reserved
     */
    public function getAvailableBrpAttribute(): int
    {
        return $this->balance_brp - $this->reserved_brp;
    }
}
