<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShippoShipment extends Model
{
    protected $fillable = [
        'order_id',
        'product_type',
        'shippo_shipment_id',
        'selected_rate_object_id',
        'shippo_transaction_id',
        'ship_to_name',
        'ship_to_street1',
        'ship_to_city',
        'ship_to_state',
        'ship_to_zip',
        'ship_to_country',
        'parcel_weight_oz',
        'parcel_length_in',
        'parcel_width_in',
        'parcel_height_in',
        'tracking_number',
        'label_url',
        'carrier',
        'status',
    ];

    protected $casts = [
        'parcel_weight_oz' => 'float',
        'parcel_length_in' => 'float',
        'parcel_width_in' => 'float',
        'parcel_height_in' => 'float',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
