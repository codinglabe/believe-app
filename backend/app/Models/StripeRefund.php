<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StripeRefund extends Model
{
    protected $table = 'stripe_refunds';

    protected $fillable = [
        'order_id',
        'refund_id',
        'payment_intent_id',
        'amount',
        'currency',
        'reason',
        'status',
        'stripe_response',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'stripe_response' => 'array',
    ];
}
