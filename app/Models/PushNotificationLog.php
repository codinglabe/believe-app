<?php

namespace App\Models;

use App\Enums\PushNotificationLogStatus;
use App\Enums\PushNotificationModule;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PushNotificationLog extends Model
{
    protected $table = 'push_notification_logs';

    protected $fillable = [
        'organization_id',
        'user_id',
        'module_name',
        'module_record_id',
        'notification_title',
        'notification_body',
        'audience_type',
        'recipient_count',
        'sent_count',
        'delivered_count',
        'opened_count',
        'failed_count',
        'status',
        'deep_link',
        'scheduled_at',
        'sent_at',
        'created_by',
    ];

    protected $casts = [
        'scheduled_at' => 'datetime',
        'sent_at' => 'datetime',
        'recipient_count' => 'integer',
        'sent_count' => 'integer',
        'delivered_count' => 'integer',
        'opened_count' => 'integer',
        'failed_count' => 'integer',
        'status' => PushNotificationLogStatus::class,
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function recipients(): HasMany
    {
        return $this->hasMany(PushNotificationRecipient::class);
    }

    public function moduleLabel(): string
    {
        return PushNotificationModule::labels()[$this->module_name] ?? ucfirst(str_replace('_', ' ', $this->module_name));
    }
}
