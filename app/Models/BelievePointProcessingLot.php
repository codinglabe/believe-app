<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BelievePointProcessingLot extends Model
{
    protected $fillable = [
        'believe_point_purchase_id',
        'user_id',
        'amount',
        'released_at',
        'metadata',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'released_at' => 'datetime',
        'metadata' => 'array',
    ];

    public function purchase(): BelongsTo
    {
        return $this->belongsTo(BelievePointPurchase::class, 'believe_point_purchase_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isOpen(): bool
    {
        return $this->released_at === null && (float) $this->amount > 0;
    }
}
