<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FeedbackCampaignResponse extends Model
{
    protected $fillable = [
        'supporter_id',
        'campaign_id',
        'reward_brp',
        'status',
    ];

    protected $casts = [
        'reward_brp' => 'integer',
    ];

    /** @var list<string> */
    protected $appends = [
        'reward_bp_display',
    ];

    /** US cents → BP display (0.03 / …); 1 BP = $1.00 */
    public function getRewardBpDisplayAttribute(): float
    {
        return round($this->reward_brp / 100, 2);
    }

    public function supporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'supporter_id');
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(FeedbackCampaign::class, 'campaign_id');
    }

    public function answers(): HasMany
    {
        return $this->hasMany(FeedbackCampaignResponseAnswer::class, 'response_id');
    }
}
