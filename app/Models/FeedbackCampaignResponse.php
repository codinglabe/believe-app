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
