<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BelievePointsRefund extends Model
{
    protected $table = 'believe_points_refunds';

    protected $fillable = [
        'order_id',
        'user_id',
        'amount',
        'reason',
        'status',
        'notes',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
    ];
}
