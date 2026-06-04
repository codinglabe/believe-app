<?php

namespace App\Models;

use App\Casts\UtcDatetime;
use App\Enums\PushNotificationLogStatus;
use App\Enums\PushNotificationModule;
use App\Models\Concerns\HasUtcTimestamps;
use App\Support\PushNotificationLogMetadata;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PushNotificationLog extends Model
{
    use HasUtcTimestamps;

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
        'scheduled_at' => UtcDatetime::class,
        'sent_at' => UtcDatetime::class,
        'created_at' => UtcDatetime::class,
        'updated_at' => UtcDatetime::class,
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
        return PushNotificationLogMetadata::moduleLabel($this);
    }

    public function resolvedModuleName(): string
    {
        return PushNotificationLogMetadata::resolveModuleName($this);
    }

    public static function userRoleLabel(?string $role): string
    {
        return match ($role) {
            'admin' => 'Admin',
            'organization' => 'Organization',
            'organization_pending' => 'Organization (Pending)',
            'user' => 'Supporter',
            'care_alliance' => 'Care Alliance',
            default => $role ? ucfirst(str_replace('_', ' ', $role)) : 'System',
        };
    }

    /**
     * @return array{id: int, name: string, role: string|null, role_label: string}|null
     */
    public function creatorPayload(): ?array
    {
        return PushNotificationLogMetadata::creatorPayload($this);
    }
}
