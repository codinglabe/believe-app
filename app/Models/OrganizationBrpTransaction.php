<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrganizationBrpTransaction extends Model
{
    protected $fillable = [
        'organization_id',
        'type',
        'amount_brp',
        'reference_type',
        'reference_id',
        'description',
        'stripe_payment_id',
    ];

    protected $casts = [
        'amount_brp' => 'integer',
        'reference_id' => 'integer',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
