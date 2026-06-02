<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DailyEngagementNotificationLog extends Model
{
    protected $fillable = [
        'user_id',
        'sent_on',
        'message_index',
    ];

    protected $casts = [
        'sent_on' => 'date',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
