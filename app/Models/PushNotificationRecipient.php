<?php

namespace App\Models;

use App\Enums\PushNotificationRecipientStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PushNotificationRecipient extends Model
{
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
    ];

    protected $casts = [
        'delivered_at' => 'datetime',
        'opened_at' => 'datetime',
        'failed_at' => 'datetime',
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
}
