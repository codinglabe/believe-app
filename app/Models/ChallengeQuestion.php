<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChallengeQuestion extends Model
{
    public const SOURCE_CSV = 'csv_import';

    public const SOURCE_OPENAI = 'openai';

    public const SOURCE_ADMIN = 'admin';

    protected $fillable = [
        'category',
        'subcategory',
        'question',
        'option_a',
        'option_b',
        'option_c',
        'option_d',
        'correct_option',
        'explanation',
        'difficulty',
        'source',
        'content_hash',
    ];

    public function events(): HasMany
    {
        return $this->hasMany(UserChallengeQuestionEvent::class, 'challenge_question_id');
    }
}
