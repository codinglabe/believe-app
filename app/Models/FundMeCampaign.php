<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class FundMeCampaign extends Model
{
    use HasFactory;

    protected $table = 'fundme_campaigns';

    protected $fillable = [
        'organization_id',
        'fundme_category_id',
        'title',
        'slug',
        'goal_amount',
        'raised_amount',
        'cover_image',
        'helps_who',
        'fund_usage',
        'expected_impact',
        'use_of_funds_confirmation',
        'status',
        'submitted_at',
        'approved_at',
        'rejection_reason',
    ];

    protected $casts = [
        'goal_amount' => 'integer',
        'raised_amount' => 'integer',
        'use_of_funds_confirmation' => 'boolean',
        'submitted_at' => 'datetime',
        'approved_at' => 'datetime',
    ];

    public const STATUS_DRAFT = 'draft';
    public const STATUS_IN_REVIEW = 'in_review';
    public const STATUS_LIVE = 'live';
    public const STATUS_REJECTED = 'rejected';
    public const STATUS_FROZEN = 'frozen';

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(FundMeCategory::class, 'fundme_category_id');
    }

    public function donations(): HasMany
    {
        return $this->hasMany(FundMeDonation::class, 'fundme_campaign_id');
    }

    public function scopeLive($query)
    {
        return $query->where('status', self::STATUS_LIVE);
    }

    public function scopeForOrganization($query, int $organizationId)
    {
        return $query->where('organization_id', $organizationId);
    }

    public function progressPercent(): float
    {
        if ($this->goal_amount <= 0) {
            return 0;
        }
        return min(100, round((float) $this->raised_amount / $this->goal_amount * 100, 1));
    }

    public function goalAmountDollars(): float
    {
        return $this->goal_amount / 100;
    }

    public function raisedAmountDollars(): float
    {
        return $this->raised_amount / 100;
    }

    public static function booted(): void
    {
        static::creating(function (FundMeCampaign $model) {
            if (empty($model->slug)) {
                $base = Str::slug($model->title);
                $model->slug = Str::slug($model->title) . '-' . Str::lower(Str::random(6));
            }
        });
    }
}
