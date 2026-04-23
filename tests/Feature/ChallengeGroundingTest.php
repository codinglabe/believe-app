<?php

use App\Models\ChallengeGroundingPassage;
use App\Models\ChallengeQuestion;
use App\Services\ChallengeGroundingService;
use App\Services\ChallengeQuestionGeneratorService;
use App\Services\OpenAiService;

/*
|--------------------------------------------------------------------------
| Requires SQLite PHP extension (pdo_sqlite) — same as phpunit.xml :memory: DB.
| Skip is evaluated before migrate:fresh so missing driver does not error.
|--------------------------------------------------------------------------
*/

beforeEach(function () {
    if (! extension_loaded('pdo_sqlite')) {
        $this->markTestSkipped('SQLite PHP extension (pdo_sqlite) is required for ChallengeGroundingTest — enable in php.ini or run ChallengeGroundingFormatTest.php instead.');
    }

    $this->artisan('migrate:fresh', ['--no-interaction' => true, '--force' => true]);
});

test('grounding service loads passages by category and subcategory topics', function () {
    ChallengeGroundingPassage::create([
        'religion' => null,
        'source_type' => 'general',
        'reference' => 'Ref A',
        'text' => 'Alpha fact for quiz.',
        'topics' => ['Faith', 'Bible'],
    ]);

    $svc = app(ChallengeGroundingService::class);
    $passages = $svc->passagesForChallengePrompt('Faith', 'Bible', null, 10);

    expect($passages)->toHaveCount(1)
        ->and($passages->first()->reference)->toBe('Ref A');

    $formatted = $svc->formatPassagesForPrompt($passages);
    expect($formatted)->toContain('Ref A')->toContain('Alpha fact');
});

test('grounding format respects max_total_chars via config not env', function () {
    config([
        'services.challenge_quiz.grounding.max_chars_per_passage' => 5000,
        'services.challenge_quiz.grounding.max_total_chars' => 120,
    ]);

    ChallengeGroundingPassage::create([
        'religion' => null,
        'source_type' => 'general',
        'reference' => 'Long',
        'text' => str_repeat('x', 500),
        'topics' => ['Faith'],
    ]);

    $svc = app(ChallengeGroundingService::class);
    $passages = $svc->passagesForChallengePrompt('Faith', null, null, 10);
    $formatted = $svc->formatPassagesForPrompt($passages);

    expect(mb_strlen($formatted))->toBeLessThanOrEqual(120);
});

test('generator sends grounding text in OpenAI messages when passages match', function () {
    config([
        'services.openai.api_key' => 'test-key-no-network',
        'services.challenge_quiz.openai_batch_size' => 1,
        'services.challenge_quiz.grounding.enabled' => true,
    ]);

    ChallengeGroundingPassage::create([
        'religion' => null,
        'source_type' => 'quran',
        'reference' => 'Smoke ref',
        'text' => 'The grounding passage text must appear in the user prompt.',
        'topics' => ['Faith', 'Bible'],
    ]);

    $openAi = Mockery::mock(OpenAiService::class);
    $openAi->shouldReceive('chatCompletionJson')
        ->once()
        ->with(
            Mockery::on(function (array $messages): bool {
                $user = $messages[1]['content'] ?? '';

                return str_contains($user, 'GROUNDING')
                    && str_contains($user, 'Smoke ref')
                    && str_contains($user, 'The grounding passage text must appear');
            }),
            Mockery::any(),
            Mockery::any(),
            Mockery::any()
        )
        ->andReturn([
            'content' => json_encode([
                'questions' => [[
                    'category' => 'Faith',
                    'subcategory' => 'Bible',
                    'question' => 'Unique grounding test question one?',
                    'option_a' => 'W',
                    'option_b' => 'X',
                    'option_c' => 'Y',
                    'option_d' => 'Z',
                    'correct_option' => 'B',
                    'explanation' => 'Ok.',
                    'difficulty' => 'Easy',
                ]],
            ], JSON_THROW_ON_ERROR),
        ]);

    $this->instance(OpenAiService::class, $openAi);

    $inserted = app(ChallengeQuestionGeneratorService::class)->generateBatchIfAllowed(
        1,
        'Faith',
        'Bible',
        'Easy',
        false,
        null,
        null,
        null,
    );

    expect($inserted)->toBe(1);
    expect(ChallengeQuestion::query()->where('question', 'Unique grounding test question one?')->exists())->toBeTrue();
});

test('generator omits grounding block when no passages match', function () {
    config([
        'services.openai.api_key' => 'test-key-no-network',
        'services.challenge_quiz.openai_batch_size' => 1,
        'services.challenge_quiz.grounding.enabled' => true,
    ]);

    $openAi = Mockery::mock(OpenAiService::class);
    $openAi->shouldReceive('chatCompletionJson')
        ->once()
        ->with(
            Mockery::on(function (array $messages): bool {
                $user = $messages[1]['content'] ?? '';

                return ! str_contains($user, 'GROUNDING (required');
            }),
            Mockery::any(),
            Mockery::any(),
            Mockery::any()
        )
        ->andReturn([
            'content' => json_encode([
                'questions' => [[
                    'category' => 'Faith',
                    'subcategory' => 'Bible',
                    'question' => 'Unique grounding test question two?',
                    'option_a' => 'W',
                    'option_b' => 'X',
                    'option_c' => 'Y',
                    'option_d' => 'Z',
                    'correct_option' => 'C',
                    'explanation' => 'Ok.',
                    'difficulty' => 'Easy',
                ]],
            ], JSON_THROW_ON_ERROR),
        ]);

    $this->instance(OpenAiService::class, $openAi);

    $inserted = app(ChallengeQuestionGeneratorService::class)->generateBatchIfAllowed(
        1,
        'Faith',
        'Bible',
        'Easy',
        false,
        null,
        null,
        null,
    );

    expect($inserted)->toBe(1);
});
