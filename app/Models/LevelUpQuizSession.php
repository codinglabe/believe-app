<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LevelUpQuizSession extends Model
{
    protected $fillable = [
        'user_id',
        'level_up_track_id',
        'started_at',
        'ended_at',
        'total_elapsed_ms',
        'correct_count',
        'incorrect_count',
        'max_answer_streak',
        'running_answer_streak',
        'streak_bonus_awarded',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
            'streak_bonus_awarded' => 'decimal:2',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function track(): BelongsTo
    {
        return $this->belongsTo(LevelUpTrack::class, 'level_up_track_id');
    }

    public function questionEvents(): HasMany
    {
        return $this->hasMany(UserChallengeQuestionEvent::class, 'level_up_quiz_session_id');
    }

    public function isOpen(): bool
    {
        return $this->ended_at === null;
    }
}
