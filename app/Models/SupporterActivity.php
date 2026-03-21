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
        'created_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'amount_cents' => 'integer',
        'believe_points' => 'integer',
    ];

    public function supporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'supporter_id');
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
