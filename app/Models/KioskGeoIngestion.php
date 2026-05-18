<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KioskGeoIngestion extends Model
{
    protected $fillable = [
        'state_abbr',
        'normalized_city',
        'zip_normalized',
        'status',
        'provider_count',
        'error_message',
        'last_ingested_at',
    ];

    protected $casts = [
        'last_ingested_at' => 'datetime',
        'provider_count' => 'integer',
    ];
}
