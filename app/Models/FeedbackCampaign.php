<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Support\Str;

class FeedbackCampaign extends Model
{
    protected $fillable = [
        'uuid',
        'merchant_id',
        'title',
        'type',
        'reward_per_response_brp',
        'total_budget_brp',
        'reserved_budget_brp',
        'spent_budget_brp',
        'remaining_budget_brp',
        'max_responses',
        'responses_count',
        'status',
    ];

    protected $casts = [
        'reward_per_response_brp' => 'integer',
        'total_budget_brp' => 'integer',
        'reserved_budget_brp' => 'integer',
        'spent_budget_brp' => 'integer',
        'remaining_budget_brp' => 'integer',
        'max_responses' => 'integer',
        'responses_count' => 'integer',
    ];

    /** @var list<string> */
    protected $appends = [
        'reward_bp_display',
        'total_budget_bp_display',
        'spent_budget_bp_display',
        'remaining_budget_bp_display',
    ];

    protected static function booted(): void
    {
        static::creating(function ($campaign) {
            if (empty($campaign->uuid)) {
                $campaign->uuid = (string) Str::uuid();
            }
        });
    }

    /**
     * Default reward per campaign type.
     */
    public static function defaultRewardForType(string $type): int
    {
        return match ($type) {
            'quick_vote' => 3,
            'short_feedback' => 10,
            'standard_survey' => 25,
            'deep_feedback' => 50,
            default => 10,
        };
    }

    /**
     * Estimated time per campaign type.
     */
    public static function estimatedTimeForType(string $type): string
    {
        return match ($type) {
            'quick_vote' => '~10 sec',
            'short_feedback' => '~1 min',
            'standard_survey' => '~3 min',
            'deep_feedback' => '~5 min',
            default => '~1 min',
        };
    }

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(Merchant::class);
    }

    public function questions(): HasMany
    {
        return $this->hasMany(FeedbackCampaignQuestion::class, 'campaign_id')->orderBy('sort_order');
    }

    public function responses(): HasMany
    {
        return $this->hasMany(FeedbackCampaignResponse::class, 'campaign_id');
    }

    public function getRouteKeyName(): string
    {
        return 'id';
    }

    /**
     * Dollar value of stored integer (US cents: 3 = $0.03, 5000 = $50.00 for budget fields).
     */
    public static function brpToDollars(int $brp): float
    {
        return round($brp * 0.01, 2);
    }

    /**
     * Per-response reward for UI (0.03 / 0.10 / … BP). Stored `reward_per_response_brp` is US cents.
     */
    public function getRewardBpDisplayAttribute(): float
    {
        return round($this->reward_per_response_brp / 100, 2);
    }

    /**
     * Budget fields in whole BP (1 BP = $1.00) for UI; DB stores US-cent integers.
     */
    public function getTotalBudgetBpDisplayAttribute(): float
    {
        return round($this->total_budget_brp / 100, 2);
    }

    public function getSpentBudgetBpDisplayAttribute(): float
    {
        return round($this->spent_budget_brp / 100, 2);
    }

    public function getRemainingBudgetBpDisplayAttribute(): float
    {
        return round($this->remaining_budget_brp / 100, 2);
    }
}
