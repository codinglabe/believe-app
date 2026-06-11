<?php

namespace App\Models;

use App\Casts\UtcDatetime;
use App\Enums\PushNotificationRecipientStatus;
use App\Models\Concerns\HasUtcTimestamps;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PushNotificationRecipient extends Model
{
    use HasUtcTimestamps;

    protected $table = 'push_notification_recipients';

    protected $fillable = [
        'push_notification_log_id',
        'recipient_user_id',
        'device_token',
        'status',
        'delivered_at',
        'opened_at',
        'failed_at',
        'failure_reason',
        'attempt_count',
        'firebase_error_code',
    ];

    protected $casts = [
        'delivered_at' => UtcDatetime::class,
        'opened_at' => UtcDatetime::class,
        'failed_at' => UtcDatetime::class,
        'created_at' => UtcDatetime::class,
        'updated_at' => UtcDatetime::class,
        'attempt_count' => 'integer',
        'status' => PushNotificationRecipientStatus::class,
    ];

    public function log(): BelongsTo
    {
        return $this->belongsTo(PushNotificationLog::class, 'push_notification_log_id');
    }

    public function recipientUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recipient_user_id');
    }

    public function failures(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(NotificationFailure::class, 'push_notification_recipient_id');
    }
}
