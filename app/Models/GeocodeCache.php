<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GeocodeCache extends Model
{
    protected $table = 'geocode_cache';

    protected $fillable = [
        'address_hash',
        'address_query',
        'latitude',
        'longitude',
    ];

    protected $casts = [
        'latitude' => 'float',
        'longitude' => 'float',
    ];
}
