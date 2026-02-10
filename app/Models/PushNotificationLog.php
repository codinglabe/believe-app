<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PushNotificationLog extends Model
{
    protected $table = 'push_notification_logs';

    protected $fillable = [
        'user_id',
        'user_push_token_id',
        'title',
        'body',
        'source_type',
        'source_id',
        'status',
        'fcm_error_code',
        'fcm_response',
        'sent_at',
    ];

    protected $casts = [
        'sent_at' => 'datetime',
        'fcm_response' => 'array',
    ];

    public const STATUS_SENT = 'sent';
    public const STATUS_FAILED = 'failed';

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function userPushToken(): BelongsTo
    {
        return $this->belongsTo(UserPushToken::class, 'user_push_token_id');
    }
}
