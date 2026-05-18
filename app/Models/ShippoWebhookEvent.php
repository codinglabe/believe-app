<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShippoWebhookEvent extends Model
{
    protected $fillable = [
        'payload_hash',
        'event_type',
        'processing_result',
        'payload_json',
        'error_message',
        'received_at',
        'processed_at',
    ];

    protected $casts = [
        'payload_json' => 'array',
        'processed_at' => 'datetime',
    ];
}
