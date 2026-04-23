<?php

namespace App\Services;

use App\Models\ChallengeQuestion;
use App\Models\LevelUpQuizSession;
use App\Models\LevelUpTrack;
use App\Models\User;
use App\Models\UserChallengeQuestionEvent;
use App\Support\ChallengeLevelUp;
use App\Support\ChallengePlayQuizMode;
use App\Support\ProfileReligions;
use Illuminate\Support\Collection;
use InvalidArgumentException;

class ChallengeQuestionService
{
    public function __construct(
        protected ChallengeQuestionGeneratorService $generator,
    ) {}

    protected function questionTimeLimitMs(bool $practiceMode = false): int
    {
        $sec = (int) config('challenge_hub.question_time_limit_seconds', 10);
        if ($practiceMode) {
            $sec = (int) round($sec * (float) config('challenge_hub.practice_time_multiplier', 1.5));
        }

        return max(1000, $sec * 1000);
    }

    /**
     * @param  string|null  $quizSubcategoryFilter  Matches {@link ChallengeQuestion::subcategory} for the selected hub challenge
     *                                              (from session card + track). Null = any subcategory in the track categories.
     * @param  string  $quizMode  {@see ChallengePlayQuizMode} easy|medium|hard|practice
     * @param  string|null  $hubChallengeTitle  Selected hub card title — passed into OpenAI when generating new rows.
     * @param  string|null  $hubChallengeDescription  Selected hub card description — same.
     * @return array<string, mixed>
     */
    public function next(
        User $user,
        LevelUpTrack $track,
        ?string $quizSubcategoryFilter = null,
        string $quizMode = ChallengePlayQuizMode::MEDIUM,
        ?string $hubChallengeTitle = null,
        ?string $hubChallengeDescription = null,
    ): array {
        if (! $track->isActive()) {
            throw new InvalidArgumentException('Track is not active.');
        }

        /** @var array<int, string> $categories */
        $categories = $track->subject_categories ?? [];
        $categories = array_values(array_filter($categories, fn ($c) => is_string($c) && $c !== ''));

        if ($categories === []) {
            return [
                'status' => 'complete',
                'message' => 'No categories configured for this track yet.',
            ];
        }

        $profileReligion = ProfileReligions::nullableAllowed($user->religion);

        $pending = UserChallengeQuestionEvent::query()
            ->where('user_id', $user->id)
            ->where('level_up_track_id', $track->id)
            ->where('status', UserChallengeQuestionEvent::STATUS_PENDING)
            ->with('challengeQuestion')
            ->first();

        if ($pending && $pending->challengeQuestion) {
            if (! $this->questionMatchesUserReligion($pending->challengeQuestion, $profileReligion)) {
                $pending->update(['status' => UserChallengeQuestionEvent::STATUS_SKIPPED]);
            } else {
                return $this->withQuestionMeta($this->questionPayloadFromEvent($pending), false);
            }
        }

        $usedIds = $this->usedQuestionIds($user->id);

        $subcategory = is_string($quizSubcategoryFilter) && trim($quizSubcategoryFilter) !== ''
            ? trim($quizSubcategoryFilter)
            : null;

        $mode = ChallengePlayQuizMode::normalize($quizMode);
        $difficultyCanonical = ChallengePlayQuizMode::difficultyLabelForQuestions($mode);
        $practiceVariety = ChallengePlayQuizMode::isPractice($mode);

        $question = $this->pickRandomUnseen($categories, $usedIds, $subcategory, $difficultyCanonical, $profileReligion);

        $generatedNewCount = 0;
        if (! $question) {
            $generatedNewCount = $this->generator->generateBatchIfAllowed(
                $user->id,
                $categories[0],
                $subcategory,
                $difficultyCanonical,
                $practiceVariety,
                $hubChallengeTitle,
                $hubChallengeDescription,
                $user->religion
            );
            $usedIds = $this->usedQuestionIds($user->id);
            $question = $this->pickRandomUnseen($categories, $usedIds, $subcategory, $difficultyCanonical, $profileReligion);
        }

        if (! $question) {
            return [
                'status' => 'exhausted',
                'message' => 'You have completed every available question for now. Check back later!',
            ];
        }

        $session = $this->getOrCreateOpenSession($user, $track);

        $event = UserChallengeQuestionEvent::create([
            'user_id' => $user->id,
            'level_up_track_id' => $track->id,
            'level_up_quiz_session_id' => $session->id,
            'challenge_question_id' => $question->id,
            'status' => UserChallengeQuestionEvent::STATUS_PENDING,
        ]);

        $event->load('challengeQuestion');

        return $this->withQuestionMeta(
            $this->questionPayloadFromEvent($event),
            $generatedNewCount > 0
        );
    }

    public function getOrCreateOpenSession(User $user, LevelUpTrack $track): LevelUpQuizSession
    {
        $existing = LevelUpQuizSession::query()
            ->where('user_id', $user->id)
            ->where('level_up_track_id', $track->id)
            ->whereNull('ended_at')
            ->latest('id')
            ->first();

        if ($existing) {
            return $existing;
        }

        return LevelUpQuizSession::create([
            'user_id' => $user->id,
            'level_up_track_id' => $track->id,
            'started_at' => now(),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function answer(
        User $user,
        LevelUpTrack $track,
        int $eventId,
        ?string $selectedOption,
        bool $timedOut = false,
        bool $practiceMode = false,
    ): array {
        if (! $track->isActive()) {
            throw new InvalidArgumentException('Track is not active.');
        }

        $event = UserChallengeQuestionEvent::query()
            ->where('id', $eventId)
            ->where('user_id', $user->id)
            ->where('level_up_track_id', $track->id)
            ->where('status', UserChallengeQuestionEvent::STATUS_PENDING)
            ->with('challengeQuestion')
            ->firstOrFail();

        $q = $event->challengeQuestion;
        if (! $q) {
            throw new InvalidArgumentException('Question missing.');
        }

        $limitMs = $this->questionTimeLimitMs($practiceMode);
        $rawElapsed = (int) max(0, $event->created_at->diffInMilliseconds(now()));
        $effectiveTimedOut = $timedOut || $rawElapsed >= $limitMs;
        $responseTimeMs = (int) min($rawElapsed, $limitMs);

        $selectedOptionNorm = null;
        $selectedStorageLetter = null;
        if (! $effectiveTimedOut) {
            if (! is_string($selectedOption)) {
                throw new InvalidArgumentException('Invalid option.');
            }
            $selectedOptionNorm = strtoupper(trim($selectedOption));
            if (! in_array($selectedOptionNorm, ['A', 'B', 'C', 'D'], true)) {
                throw new InvalidArgumentException('Invalid option.');
            }
            /** Display letters A–D are shuffled per event; map back to stored column letter for grading. */
            $selectedStorageLetter = $this->mapDisplayLetterToStorageLetter($q, (int) $event->id, $selectedOptionNorm);
        }

        $correct = ! $effectiveTimedOut
            && $selectedStorageLetter !== null
            && strtoupper((string) $q->correct_option) === $selectedStorageLetter;

        $pointsPerCorrect = (float) config('services.challenge_quiz.points_per_correct', 10);
        $pointsPerIncorrect = (float) config('services.challenge_quiz.points_per_incorrect', $pointsPerCorrect);

        $points = 0.0;
        if (! $practiceMode) {
            if ($correct) {
                $points = $pointsPerCorrect;
                $user->addRewardPoints(
                    $points,
                    ChallengeLevelUp::LEDGER_SOURCE,
                    $event->id,
                    $track->name.' — correct answer',
                    [
                        'level_up_track_slug' => $track->slug,
                        'challenge_question_id' => $q->id,
                    ]
                );
            } else {
                $deduct = $pointsPerIncorrect;
                if ($deduct > 0.00001) {
                    $user->deductRewardPoints(
                        $deduct,
                        ChallengeLevelUp::LEDGER_SOURCE,
                        $event->id,
                        $track->name.' — incorrect answer',
                        [
                            'level_up_track_slug' => $track->slug,
                            'challenge_question_id' => $q->id,
                            'timed_out' => $effectiveTimedOut,
                        ],
                        allowNegativeBalance: true
                    );
                    $points = -1 * $deduct;
                }
            }
        }

        $event->update([
            'status' => UserChallengeQuestionEvent::STATUS_ANSWERED,
            'selected_option' => $effectiveTimedOut ? null : $selectedOptionNorm,
            'is_correct' => $correct,
            'points_awarded' => $points,
            'answered_at' => now(),
            'response_time_ms' => $responseTimeMs,
            'timed_out' => $effectiveTimedOut,
        ]);

        if ($event->level_up_quiz_session_id) {
            $session = LevelUpQuizSession::query()->find($event->level_up_quiz_session_id);
            $this->updateSessionAfterAnswer($session, $correct);
        }

        return [
            'event_id' => $event->id,
            'is_correct' => $correct,
            'correct_option' => $this->mapStorageLetterToDisplayLetter($q, (int) $event->id, (string) $q->correct_option),
            'correct_answer_text' => $this->optionTextForStorageLetter($q, (string) $q->correct_option),
            'explanation' => $q->explanation,
            'points_awarded' => $points,
            'reward_points_balance' => $user->fresh()->currentRewardPoints(),
            'response_time_ms' => $responseTimeMs,
            'timed_out' => $effectiveTimedOut,
        ];
    }

    /**
     * Drops any unanswered question on the open session, then closes that session (same scoring as exhaustion).
     *
     * @return array<string, mixed>|null Null when there is no open quiz session for this track.
     */
    public function finishTrackQuizForUser(User $user, LevelUpTrack $track, bool $practiceMode = false): ?array
    {
        $session = LevelUpQuizSession::query()
            ->where('user_id', $user->id)
            ->where('level_up_track_id', $track->id)
            ->whereNull('ended_at')
            ->latest('id')
            ->first();

        if (! $session) {
            return null;
        }

        UserChallengeQuestionEvent::query()
            ->where('level_up_quiz_session_id', $session->id)
            ->where('status', UserChallengeQuestionEvent::STATUS_PENDING)
            ->update(['status' => UserChallengeQuestionEvent::STATUS_SKIPPED]);

        return $this->finalizeOpenSessionForTrack($user, $track, $practiceMode);
    }

    protected function updateSessionAfterAnswer(?LevelUpQuizSession $session, bool $correct): void
    {
        if (! $session || ! $session->isOpen()) {
            return;
        }

        if ($correct) {
            $running = $session->running_answer_streak + 1;
            $session->correct_count = $session->correct_count + 1;
        } else {
            $running = 0;
            $session->incorrect_count = $session->incorrect_count + 1;
        }

        $session->running_answer_streak = $running;
        $session->max_answer_streak = max((int) $session->max_answer_streak, $running);
        $session->save();
    }

    /**
     * Close the open session for this track and return a payload for the results screen.
     *
     * @return array<string, mixed>|null
     */
    public function finalizeOpenSessionForTrack(User $user, LevelUpTrack $track, bool $practiceMode = false): ?array
    {
        $session = LevelUpQuizSession::query()
            ->where('user_id', $user->id)
            ->where('level_up_track_id', $track->id)
            ->whereNull('ended_at')
            ->latest('id')
            ->first();

        if (! $session) {
            return null;
        }

        $ended = now();
        $totalMs = (int) min(PHP_INT_MAX, max(0, $session->started_at->diffInMilliseconds($ended)));

        $events = UserChallengeQuestionEvent::query()
            ->where('level_up_quiz_session_id', $session->id)
            ->where('status', UserChallengeQuestionEvent::STATUS_ANSWERED)
            ->get();

        $correct = $events->where('is_correct', true)->count();
        $total = $events->count();
        $pointsFromAnswers = (float) $events->sum(fn (UserChallengeQuestionEvent $e) => (float) $e->points_awarded);

        $bonus = $practiceMode ? 0.0 : $this->streakBonusPoints((int) $session->max_answer_streak);

        if (! $practiceMode && $bonus > 0.00001) {
            $user->addRewardPoints(
                $bonus,
                ChallengeLevelUp::LEDGER_SOURCE,
                $session->id,
                $track->name.' — streak bonus',
                [
                    'level_up_track_slug' => $track->slug,
                    'level_up_quiz_session_id' => $session->id,
                ]
            );
        }

        $session->update([
            'ended_at' => $ended,
            'total_elapsed_ms' => $totalMs,
            'streak_bonus_awarded' => $bonus,
        ]);

        return [
            'headline' => 'Quiz Results',
            'summary' => $total === 0
                ? 'No questions were answered in this run.'
                : sprintf('You scored %d out of %d questions correctly.', $correct, $total),
            'congratulations' => $total > 0 && $correct >= (int) ceil($total / 2),
            'score_correct' => $correct,
            'score_total' => $total,
            'points_from_answers' => round($pointsFromAnswers, 2),
            'streak_bonus' => round($bonus, 2),
            'points_total' => round($pointsFromAnswers + $bonus, 2),
            'max_streak' => (int) $session->max_answer_streak,
            'total_time_ms' => $totalMs,
            'reward_points_balance' => $user->fresh()->currentRewardPoints(),
        ];
    }

    protected function streakBonusPoints(int $maxStreak): float
    {
        if ($maxStreak < 2) {
            return 0.0;
        }

        $tier = (float) config('challenge_hub.streak_bonus_per_streak_tier', 10);
        $cap = (float) config('challenge_hub.streak_bonus_cap', 30);

        return min($cap, max(0.0, ($maxStreak - 1) * $tier));
    }

    /**
     * @param  array<int, string>  $categories
     * @param  Collection<int, int>  $usedIds
     */
    /**
     * @param  string|null  $profileReligion  {@see ProfileReligions::nullableAllowed()} — when set, only rows tagged with that tradition; untagged rows are excluded (legacy/generic pool is for users without a profile religion).
     */
    protected function questionMatchesUserReligion(ChallengeQuestion $q, ?string $profileReligion): bool
    {
        $tag = $q->religion;
        $tag = is_string($tag) ? trim($tag) : '';
        if ($profileReligion !== null) {
            return $tag === $profileReligion;
        }

        return $tag === '';
    }

    protected function pickRandomUnseen(
        array $categories,
        Collection $usedIds,
        ?string $subcategory = null,
        ?string $difficultyCanonical = null,
        ?string $profileReligion = null,
    ): ?ChallengeQuestion {
        $sub = is_string($subcategory) ? trim($subcategory) : '';
        $diff = is_string($difficultyCanonical) ? trim($difficultyCanonical) : '';

        return ChallengeQuestion::query()
            ->whereIn('category', $categories)
            ->when($sub !== '', fn ($q) => $q->where('subcategory', $sub))
            ->when($diff !== '', function ($q) use ($diff) {
                $q->whereRaw('LOWER(TRIM(COALESCE(difficulty, ""))) = ?', [strtolower($diff)]);
            })
            ->when(
                $profileReligion !== null,
                fn ($q) => $q->where('religion', $profileReligion),
                fn ($q) => $q->whereNull('religion'),
            )
            ->when($usedIds->isNotEmpty(), fn ($q) => $q->whereNotIn('id', $usedIds))
            ->inRandomOrder()
            ->first();
    }

    /**
     * Every question id the user has been assigned (pending, answered, or skipped) — never repeats a row per user (DB unique).
     *
     * @return Collection<int, int>
     */
    protected function usedQuestionIds(int $userId): Collection
    {
        return UserChallengeQuestionEvent::query()
            ->where('user_id', $userId)
            ->pluck('challenge_question_id');
    }

    /**
     * Stable order for this event so options are shuffled on screen but the same order is used when grading.
     *
     * @return list<array{0: 'A'|'B'|'C'|'D', 1: string}>
     */
    protected function orderedOptionPairsForPlay(ChallengeQuestion $q, int $eventId): array
    {
        $pairs = [
            ['A', trim((string) $q->option_a)],
            ['B', trim((string) $q->option_b)],
            ['C', trim((string) $q->option_c)],
            ['D', trim((string) $q->option_d)],
        ];

        usort($pairs, function (array $a, array $b) use ($q, $eventId): int {
            $ha = hash('sha256', $eventId.'|'.$q->id.'|'.$a[0]);
            $hb = hash('sha256', $eventId.'|'.$q->id.'|'.$b[0]);

            return strcmp($ha, $hb);
        });

        return $pairs;
    }

    /** Stored {@see ChallengeQuestion::$correct_option} letter → letter shown on the play UI for this event. */
    public function mapStorageLetterToDisplayLetter(ChallengeQuestion $q, int $eventId, string $storageLetter): string
    {
        $storageLetter = strtoupper(trim($storageLetter));
        $pairs = $this->orderedOptionPairsForPlay($q, $eventId);
        foreach ($pairs as $i => $pair) {
            if ($pair[0] === $storageLetter) {
                return chr(ord('A') + $i);
            }
        }

        return $storageLetter;
    }

    protected function optionTextForStorageLetter(ChallengeQuestion $q, string $storageLetter): string
    {
        return match (strtoupper(trim($storageLetter))) {
            'A' => trim((string) $q->option_a),
            'B' => trim((string) $q->option_b),
            'C' => trim((string) $q->option_c),
            'D' => trim((string) $q->option_d),
            default => '',
        };
    }

    /** Letter the learner tapped (A–D on screen) → stored column letter for this event. */
    public function mapDisplayLetterToStorageLetter(ChallengeQuestion $q, int $eventId, string $displayLetter): string
    {
        $displayLetter = strtoupper(trim($displayLetter));
        if (! in_array($displayLetter, ['A', 'B', 'C', 'D'], true)) {
            throw new InvalidArgumentException('Invalid option.');
        }

        $pairs = $this->orderedOptionPairsForPlay($q, $eventId);
        $idx = ord($displayLetter) - ord('A');
        $pair = $pairs[$idx] ?? null;
        if ($pair === null) {
            throw new InvalidArgumentException('Invalid option.');
        }

        return $pair[0];
    }

    /**
     * @return array<string, mixed>
     */
    protected function questionPayloadFromEvent(UserChallengeQuestionEvent $event): array
    {
        $q = $event->challengeQuestion;
        if (! $q) {
            return [
                'status' => 'error',
                'message' => 'Question not found.',
            ];
        }

        $pairs = $this->orderedOptionPairsForPlay($q, (int) $event->id);

        $optionRows = [];
        foreach ($pairs as $i => [, $text]) {
            $optionRows[] = [
                'answer_key' => chr(ord('A') + $i),
                'text' => $text,
            ];
        }

        return [
            'status' => 'question',
            'event_id' => $event->id,
            'category' => $q->category,
            'subcategory' => $q->subcategory,
            'question' => $q->question,
            'option_rows' => $optionRows,
            'difficulty' => $q->difficulty,
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    protected function withQuestionMeta(array $payload, bool $generatedNewQuestions): array
    {
        if (($payload['status'] ?? null) !== 'question') {
            return $payload;
        }
        $payload['generated_new_questions'] = $generatedNewQuestions;

        return $payload;
    }
}
