<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupporterActivity extends Model
{
    public const UPDATED_AT = null;

    public const EVENT_DONATION_COMPLETED = 'donation.completed';

    public const EVENT_PURCHASE_COMPLETED = 'purchase.completed';

    public const EVENT_COURSES_COMPLETED = 'courses.completed';

    public const EVENT_EVENTS_COMPLETED = 'events.completed';

    public const EVENT_VOLUNTEER_SIGNUP = 'volunteer.signup';

    /** @var list<string> */
    public const EVENT_TYPES = [
        self::EVENT_DONATION_COMPLETED,
        self::EVENT_PURCHASE_COMPLETED,
        self::EVENT_COURSES_COMPLETED,
        self::EVENT_EVENTS_COMPLETED,
        self::EVENT_VOLUNTEER_SIGNUP,
    ];

    protected $table = 'supporter_activity';

    protected $fillable = [
        'supporter_id',
        'organization_id',
        'event_type',
        'reference_id',
        'amount_cents',
        'believe_points',
        'submodule_type',
        'page_name',
        'route_name',
        'action_type',
        'interest_category_id',
        'interest_category_name',
        'target_entity_type',
        'target_entity_id',
        'target_entity_title',
        'search_term',
        'filter_json',
        'referrer_url',
        'entry_source',
        'dwell_seconds',
        'transaction_reference',
        'outcome_type',
        'metadata_json',
        'created_at',
        'updated_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'amount_cents' => 'integer',
        'believe_points' => 'integer',
        'interest_category_id' => 'integer',
        'target_entity_id' => 'integer',
        'dwell_seconds' => 'integer',
        'filter_json' => 'array',
        'metadata_json' => 'array',
    ];

    public static function inferTargetEntityType(string $eventType): string
    {
        return match ($eventType) {
            self::EVENT_DONATION_COMPLETED => 'donation',
            self::EVENT_PURCHASE_COMPLETED => 'order_line',
            self::EVENT_COURSES_COMPLETED => 'enrollment',
            self::EVENT_EVENTS_COMPLETED => 'enrollment',
            self::EVENT_VOLUNTEER_SIGNUP => 'job_application',
            default => 'record',
        };
    }

    public function supporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'supporter_id');
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
