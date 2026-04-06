<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CareAllianceInvitation extends Model
{
    protected $fillable = [
        'care_alliance_id',
        'invited_by_user_id',
        'token',
        'email',
        'organization_id',
        'status',
        'expires_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
    ];

    public function careAlliance(): BelongsTo
    {
        return $this->belongsTo(CareAlliance::class);
    }

    public function invitedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by_user_id');
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
