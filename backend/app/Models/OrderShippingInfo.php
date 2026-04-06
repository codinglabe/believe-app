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
        'phone',
        'shipping_address',
        'shipping_address_line2',
        'city',
        'country',
        'state',
        'zip',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
