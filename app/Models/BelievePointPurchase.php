<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BelievePointPurchase extends Model
{
    protected $fillable = [
        'user_id',
        'amount',
        'points',
        'stripe_session_id',
        'stripe_payment_intent_id',
        'status',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'points' => 'decimal:2',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
