<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderSplit extends Model
{
    protected $fillable = [
        'order_id',
        'merchant_amount',
        'organization_amount',
        'biu_amount',
    ];

    protected function casts(): array
    {
        return [
            'merchant_amount' => 'decimal:2',
            'organization_amount' => 'decimal:2',
            'biu_amount' => 'decimal:2',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
