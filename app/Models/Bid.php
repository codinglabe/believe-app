<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Bid extends Model
{
    protected $fillable = [
        'product_id',
        'user_id',
        'bid_amount',
        'status',
        'submitted_at',
    ];

    protected $casts = [
        'bid_amount' => 'decimal:2',
        'submitted_at' => 'datetime',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
