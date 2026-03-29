<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CareAllianceJoinRequest extends Model
{
    protected $fillable = [
        'care_alliance_id',
        'organization_id',
        'requested_by_user_id',
        'message',
        'status',
        'reviewed_at',
        'reviewed_by_user_id',
    ];

    protected $casts = [
        'reviewed_at' => 'datetime',
    ];

    public function careAlliance(): BelongsTo
    {
        return $this->belongsTo(CareAlliance::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by_user_id');
    }

    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by_user_id');
    }
}
