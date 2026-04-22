<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FeedbackCampaignQuestion extends Model
{
    protected $fillable = [
        'campaign_id',
        'question_text',
        'question_type',
        'sort_order',
    ];

    protected $casts = [
        'sort_order' => 'integer',
    ];

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(FeedbackCampaign::class, 'campaign_id');
    }

    public function options(): HasMany
    {
        return $this->hasMany(FeedbackCampaignQuestionOption::class, 'question_id')->orderBy('sort_order');
    }

    public function answers(): HasMany
    {
        return $this->hasMany(FeedbackCampaignResponseAnswer::class, 'question_id');
    }
}
