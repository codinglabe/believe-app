<?php

namespace App\Models;

use App\Casts\UtcDatetime;
use App\Models\Concerns\HasUtcTimestamps;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NotificationFailure extends Model
{
    use HasUtcTimestamps;

    protected $fillable = [
        'notification_id',
        'push_notification_recipient_id',
        'user_id',
        'device_token',
        'firebase_error_code',
        'failure_reason',
        'firebase_response',
        'attempt_count',
        'failed_at',
    ];

    protected $casts = [
        'firebase_response' => 'array',
        'attempt_count' => 'integer',
        'failed_at' => UtcDatetime::class,
        'created_at' => UtcDatetime::class,
        'updated_at' => UtcDatetime::class,
    ];

    public function notification(): BelongsTo
    {
        return $this->belongsTo(PushNotificationLog::class, 'notification_id');
    }

    public function recipient(): BelongsTo
    {
        return $this->belongsTo(PushNotificationRecipient::class, 'push_notification_recipient_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
