<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FeedbackCampaignQuestionOption extends Model
{
    protected $fillable = [
        'question_id',
        'option_text',
        'sort_order',
    ];

    protected $casts = [
        'sort_order' => 'integer',
    ];

    public function question(): BelongsTo
    {
        return $this->belongsTo(FeedbackCampaignQuestion::class, 'question_id');
    }
}
