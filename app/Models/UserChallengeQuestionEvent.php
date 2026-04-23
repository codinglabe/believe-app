<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserChallengeQuestionEvent extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_ANSWERED = 'answered';

    /** Quit mid-quiz / religion mismatch / abandon — counts as “seen” so the question is not repeated. */
    public const STATUS_SKIPPED = 'skipped';

    protected $fillable = [
        'user_id',
        'level_up_track_id',
        'level_up_quiz_session_id',
        'challenge_question_id',
        'status',
        'selected_option',
        'is_correct',
        'points_awarded',
        'answered_at',
        'response_time_ms',
        'timed_out',
    ];

    protected function casts(): array
    {
        return [
            'is_correct' => 'boolean',
            'points_awarded' => 'decimal:2',
            'answered_at' => 'datetime',
            'timed_out' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function levelUpTrack(): BelongsTo
    {
        return $this->belongsTo(LevelUpTrack::class);
    }

    public function quizSession(): BelongsTo
    {
        return $this->belongsTo(LevelUpQuizSession::class, 'level_up_quiz_session_id');
    }

    public function challengeQuestion(): BelongsTo
    {
        return $this->belongsTo(ChallengeQuestion::class);
    }
}
