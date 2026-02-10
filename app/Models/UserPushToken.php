<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserPushToken extends Model
{
    protected $table = 'user_push_tokens';

    protected $fillable = [
        'user_id',
        'push_token',
        'device_id',
        'device_type',
        'device_name',
        'browser',
        'platform',
        'is_active',
        'status',
        'last_error',
        'last_error_at',
        'needs_reregister',
        'last_used_at',
    ];

    protected $casts = [
        'last_used_at' => 'datetime',
        'last_error_at' => 'datetime',
        'needs_reregister' => 'boolean',
    ];

    public const STATUS_ACTIVE = 'active';
    public const STATUS_INVALID = 'invalid';
    public const STATUS_OPTED_OUT = 'opted_out';

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function notificationLogs(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(PushNotificationLog::class, 'user_push_token_id');
    }

    public function isActive(): bool
    {
        return $this->is_active && $this->status === self::STATUS_ACTIVE;
    }
}
