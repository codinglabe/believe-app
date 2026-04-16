<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupporterBirthdayNotificationLog extends Model
{
    protected $fillable = [
        'follower_id',
        'celebrant_id',
        'year',
    ];

    protected $casts = [
        'year' => 'integer',
    ];

    public function follower(): BelongsTo
    {
        return $this->belongsTo(User::class, 'follower_id');
    }

    public function celebrant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'celebrant_id');
    }
}
