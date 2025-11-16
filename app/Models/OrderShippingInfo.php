<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderShippingInfo extends Model
{
    protected $table = 'order_shipping_infos';

    protected $fillable = [
        'order_id',
        'first_name',
        'last_name',
        'email',
        'shipping_address',
        'city',
        'zip',
        'phone',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
