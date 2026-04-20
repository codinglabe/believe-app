<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChallengeQuizSubcategory extends Model
{
    protected $fillable = [
        'challenge_hub_category_id',
        'name',
        'sort_order',
    ];

    public function hubCategory(): BelongsTo
    {
        return $this->belongsTo(ChallengeHubCategory::class, 'challenge_hub_category_id');
    }
}
