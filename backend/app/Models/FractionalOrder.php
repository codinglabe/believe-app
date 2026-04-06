<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FractionalOrder extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'offering_id',
        'order_number',
        'tag_number',
        'shares',
        'tokens',
        'amount',
        'status',
        'payment_provider',
        'payment_intent_id',
        'paid_at',
        'meta',
    ];

    protected $casts = [
        'meta' => 'array',
        'paid_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function offering(): BelongsTo
    {
        return $this->belongsTo(FractionalOffering::class, 'offering_id');
    }
}


