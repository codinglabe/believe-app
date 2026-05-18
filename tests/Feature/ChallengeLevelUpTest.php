<?php

use App\Models\ChallengeQuestion;
use App\Models\LevelUpQuizSession;
use App\Models\LevelUpTrack;
use App\Models\RewardPointLedger;
use App\Models\User;
use App\Models\UserChallengeQuestionEvent;
use App\Services\ChallengeQuestionService;
use App\Support\ChallengeLevelUp;
use App\Support\ChallengeQuestionHasher;
use Database\Seeders\ChallengeHubCategoriesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;

uses(RefreshDatabase::class);

beforeEach(function () {
    if (! extension_loaded('pdo_sqlite')) {
        $this->markTestSkipped('SQLite (pdo_sqlite) is required for the default test database.');
    }
});

/** Any MC option letter that is not the correct answer (deterministic wrong guess). */
function challengeWrongOptionLetter(?string $correctOption): string
{
    $c = strtoupper(trim((string) $correctOption));
    foreach (['A', 'B', 'C', 'D'] as $opt) {
        if ($opt !== $c) {
            return $opt;
        }
    }

    return 'B';
}

function seedFaithQuestions(): void
{
    $rows = [
        ['Unique test question one?', 'A1', 'B1', 'C1', 'D1', 'A'],
        ['Unique test question two?', 'A2', 'B2', 'C2', 'D2', 'B'],
    ];
    foreach ($rows as $r) {
        $hash = ChallengeQuestionHasher::hash('Faith', $r[0], $r[1], $r[2], $r[3], $r[4]);
        ChallengeQuestion::create([
            'category' => 'Faith',
            'subcategory' => 'Test',
            'question' => $r[0],
            'option_a' => $r[1],
            'option_b' => $r[2],
            'option_c' => $r[3],
            'option_d' => $r[4],
            'correct_option' => $r[5],
            'explanation' => 'Test explanation.',
            'difficulty' => 'Medium',
            'source' => ChallengeQuestion::SOURCE_CSV,
            'content_hash' => $hash,
        ]);
    }
}

test('guest is redirected from level up index', function () {
    $this->get(route('challenge-hub.index'))->assertRedirect();
});

test('authenticated user can view level up menu', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('challenge-hub.index'))
        ->assertOk();
});

test('authenticated user can view challenges listing for active track', function () {
    seedFaithQuestions();
    $this->seed(ChallengeHubCategoriesSeeder::class);
    $user = User::factory()->create();
    $track = LevelUpTrack::query()->where('slug', 'faith_level_up')->firstOrFail();

    $this->actingAs($user)
        ->get(route('challenge-hub.challenges', $track->slug))
        ->assertOk();
});

test('finish ends session and discards unanswered pending question', function () {
    seedFaithQuestions();
    $user = User::factory()->create();
    $track = LevelUpTrack::query()->where('slug', 'faith_level_up')->firstOrFail();

    $this->actingAs($user)->post(route('challenge-hub.next', $track->slug));

    expect(UserChallengeQuestionEvent::query()
        ->where('user_id', $user->id)
        ->where('status', UserChallengeQuestionEvent::STATUS_PENDING)
        ->count())->toBe(1);

    $this->actingAs($user)->post(route('challenge-hub.finish', $track->slug))->assertOk();

    expect(UserChallengeQuestionEvent::query()
        ->where('user_id', $user->id)
        ->where('status', UserChallengeQuestionEvent::STATUS_PENDING)
        ->count())->toBe(0);

    expect(LevelUpQuizSession::query()
        ->where('user_id', $user->id)
        ->whereNull('ended_at')
        ->count())->toBe(0);
});

test('calling next twice without answering does not assign a second question', function () {
    seedFaithQuestions();
    $user = User::factory()->create();
    $track = LevelUpTrack::query()->where('slug', 'faith_level_up')->firstOrFail();

    $this->actingAs($user)->post(route('challenge-hub.next', $track->slug));
    $this->actingAs($user)->post(route('challenge-hub.next', $track->slug));

    expect(UserChallengeQuestionEvent::query()->where('user_id', $user->id)->count())->toBe(1);
});

test('correct answer credits reward points and ledger with challenge source', function () {
    seedFaithQuestions();
    $user = User::factory()->create();
    $track = LevelUpTrack::query()->where('slug', 'faith_level_up')->firstOrFail();

    $this->actingAs($user)->post(route('challenge-hub.next', $track->slug));
    $event = UserChallengeQuestionEvent::query()->where('user_id', $user->id)->firstOrFail();
    $q = $event->challengeQuestion;
    $correctDisplay = app(ChallengeQuestionService::class)->mapStorageLetterToDisplayLetter(
        $q,
        (int) $event->id,
        (string) $q->correct_option
    );

    $this->actingAs($user)->post(route('challenge-hub.answer', $track->slug), [
        'event_id' => $event->id,
        'selected_option' => $correctDisplay,
    ]);

    $user->refresh();
    $expected = (float) config('services.challenge_quiz.points_per_correct', 10);
    expect((float) $user->reward_points)->toBe($expected);

    $ledger = RewardPointLedger::query()
        ->where('user_id', $user->id)
        ->where('source', ChallengeLevelUp::LEDGER_SOURCE)
        ->first();

    expect($ledger)->not->toBeNull();
    expect((float) $ledger->points)->toBe($expected);
});

test('wrong answer deducts reward points when balance is available', function () {
    seedFaithQuestions();
    $penalty = (float) config('services.challenge_quiz.points_per_incorrect', config('services.challenge_quiz.points_per_correct', 10));
    $start = 100.0;
    $user = User::factory()->create(['reward_points' => $start]);
    $track = LevelUpTrack::query()->where('slug', 'faith_level_up')->firstOrFail();

    $this->actingAs($user)->post(route('challenge-hub.next', $track->slug));
    $event = UserChallengeQuestionEvent::query()->where('user_id', $user->id)->firstOrFail();
    $q = $event->fresh()->challengeQuestion;
    $wrongStorage = challengeWrongOptionLetter((string) $q->correct_option);
    $wrongDisplay = app(ChallengeQuestionService::class)->mapStorageLetterToDisplayLetter($q, (int) $event->id, $wrongStorage);

    $this->actingAs($user)->post(route('challenge-hub.answer', $track->slug), [
        'event_id' => $event->id,
        'selected_option' => $wrongDisplay,
    ]);

    $user->refresh();
    expect((float) $user->reward_points)->toBe($start - $penalty);

    $event->refresh();
    expect((float) $event->points_awarded)->toBe(-1 * $penalty);
});

test('wrong answer applies full penalty when balance is zero resulting in negative balance', function () {
    seedFaithQuestions();
    $penalty = (float) config('services.challenge_quiz.points_per_incorrect', config('services.challenge_quiz.points_per_correct', 10));
    $user = User::factory()->create(['reward_points' => 0]);
    $track = LevelUpTrack::query()->where('slug', 'faith_level_up')->firstOrFail();

    $this->actingAs($user)->post(route('challenge-hub.next', $track->slug));
    $event = UserChallengeQuestionEvent::query()->where('user_id', $user->id)->firstOrFail();
    $q = $event->fresh()->challengeQuestion;
    $wrongStorage = challengeWrongOptionLetter((string) $q->correct_option);
    $wrongDisplay = app(ChallengeQuestionService::class)->mapStorageLetterToDisplayLetter($q, (int) $event->id, $wrongStorage);

    $this->actingAs($user)->post(route('challenge-hub.answer', $track->slug), [
        'event_id' => $event->id,
        'selected_option' => $wrongDisplay,
    ]);

    $user->refresh();
    expect((float) $user->reward_points)->toBe(-1 * $penalty);

    $event->refresh();
    expect((float) $event->points_awarded)->toBe(-1 * $penalty);
});

test('second question after first is different row', function () {
    seedFaithQuestions();
    $user = User::factory()->create();
    $track = LevelUpTrack::query()->where('slug', 'faith_level_up')->firstOrFail();

    $this->actingAs($user)->post(route('challenge-hub.next', $track->slug));
    $event1 = UserChallengeQuestionEvent::query()->where('user_id', $user->id)->firstOrFail();
    $qid1 = $event1->challenge_question_id;

    $q1 = $event1->fresh()->challengeQuestion;
    $wrongStorage = challengeWrongOptionLetter((string) $q1->correct_option);
    $wrongDisplay = app(ChallengeQuestionService::class)->mapStorageLetterToDisplayLetter($q1, (int) $event1->id, $wrongStorage);

    $this->actingAs($user)->post(route('challenge-hub.answer', $track->slug), [
        'event_id' => $event1->id,
        'selected_option' => $wrongDisplay,
    ]);

    $this->actingAs($user)->post(route('challenge-hub.next', $track->slug));
    $event2 = UserChallengeQuestionEvent::query()
        ->where('user_id', $user->id)
        ->where('id', '!=', $event1->id)
        ->firstOrFail();

    expect($event2->challenge_question_id)->not->toBe($qid1);
});

test('csv import is idempotent for duplicate content hashes', function () {
    $path = database_path('data/challenge_questions_clean_unique.csv');
    if (! is_readable($path)) {
        $this->markTestSkipped('database/data/challenge_questions_clean_unique.csv not available');
    }

    Artisan::call('challenge:import-csv', ['--category' => 'Faith']);
    $first = ChallengeQuestion::query()->where('category', 'Faith')->count();
    Artisan::call('challenge:import-csv', ['--category' => 'Faith']);
    $second = ChallengeQuestion::query()->where('category', 'Faith')->count();

    expect($second)->toBe($first);
});
