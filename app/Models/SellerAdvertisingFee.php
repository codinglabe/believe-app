<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SellerAdvertisingFee extends Model
{
    protected $fillable = [
        'seller_id',
        'amount',
        'billing_period_start',
        'billing_period_end',
        'status',
        'paid_at',
        'payment_method',
        'notes',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'billing_period_start' => 'date',
        'billing_period_end' => 'date',
        'paid_at' => 'datetime',
    ];

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }
}
