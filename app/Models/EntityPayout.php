<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class EntityPayout extends Model
{
    protected $fillable = [
        'payable_type',
        'payable_id',
        'payout_method',
        'amount',
        'currency',
        'status',
        'reference_type',
        'reference_id',
        'module',
        'external_batch_id',
        'external_item_id',
        'notes',
        'metadata',
        'processed_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'metadata' => 'array',
        'processed_at' => 'datetime',
    ];

    public function payable(): MorphTo
    {
        return $this->morphTo();
    }
}
