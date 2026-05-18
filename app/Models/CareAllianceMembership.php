<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CareAllianceMembership extends Model
{
    protected $fillable = [
        'care_alliance_id',
        'organization_id',
        'status',
        'invited_at',
        'responded_at',
    ];

    protected $casts = [
        'invited_at' => 'datetime',
        'responded_at' => 'datetime',
    ];

    public function careAlliance(): BelongsTo
    {
        return $this->belongsTo(CareAlliance::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
