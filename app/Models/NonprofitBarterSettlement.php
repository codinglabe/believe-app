<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NonprofitBarterSettlement extends Model
{
    protected $table = 'nonprofit_barter_settlements';

    protected $fillable = [
        'transaction_id',
        'from_organization_id',
        'to_organization_id',
        'points',
    ];

    protected $casts = [
        'points' => 'integer',
    ];

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(NonprofitBarterTransaction::class);
    }

    public function fromOrganization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'from_organization_id');
    }

    public function toOrganization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'to_organization_id');
    }
}
