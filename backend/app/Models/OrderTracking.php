<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderTracking extends Model
{
    protected $fillable = [
        'order_id',
        'status',
        'carrier',
        'tracking_number',
        'tracking_url',
        'printify_event_data',
        'description',
        'event_date',
    ];

    protected $casts = [
        'printify_event_data' => 'json',
        'event_date' => 'datetime',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
