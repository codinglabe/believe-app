<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupporterPrimaryOrganizationChange extends Model
{
    protected $fillable = [
        'user_id',
        'previous_organization_id',
        'new_organization_id',
        'notified_organization_id',
        'reason',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function previousOrganization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'previous_organization_id');
    }

    public function newOrganization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'new_organization_id');
    }

    public function notifiedOrganization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'notified_organization_id');
    }
}
