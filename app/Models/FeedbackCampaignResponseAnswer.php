<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FeedbackCampaignResponseAnswer extends Model
{
    protected $fillable = [
        'response_id',
        'question_id',
        'answer_text',
        'option_id',
    ];

    public function response(): BelongsTo
    {
        return $this->belongsTo(FeedbackCampaignResponse::class, 'response_id');
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(FeedbackCampaignQuestion::class, 'question_id');
    }

    public function option(): BelongsTo
    {
        return $this->belongsTo(FeedbackCampaignQuestionOption::class, 'option_id');
    }
}
