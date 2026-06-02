<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProximityNotificationLog extends Model
{
    protected $fillable = [
        'user_id',
        'target_type',
        'target_id',
        'notified_at',
    ];

    protected $casts = [
        'notified_at' => 'datetime',
        'target_id' => 'integer',
        'user_id' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
