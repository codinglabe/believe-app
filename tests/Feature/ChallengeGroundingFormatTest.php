<?php

/**
 * No database — runs even when php-sqlite is not installed (Windows PHP often lacks pdo_sqlite).
 * Covers token caps on the formatted grounding block.
 */

use App\Models\ChallengeGroundingPassage;
use App\Services\ChallengeGroundingService;

test('formatPassagesForPrompt truncates per passage and overall using config()', function () {
    config([
        'services.challenge_quiz.grounding.max_chars_per_passage' => 80,
        'services.challenge_quiz.grounding.max_total_chars' => 150,
    ]);

    $a = new ChallengeGroundingPassage([
        'source_type' => 'general',
        'reference' => 'A',
        'text' => str_repeat('x', 500),
    ]);
    $a->id = 1;

    $b = new ChallengeGroundingPassage([
        'source_type' => 'general',
        'reference' => 'B',
        'text' => str_repeat('y', 500),
    ]);
    $b->id = 2;

    $out = app(ChallengeGroundingService::class)->formatPassagesForPrompt(collect([$a, $b]));

    expect(mb_strlen($out))->toBeLessThanOrEqual(150)
        ->and($out)->toContain('…');
});

test('formatPassagesForPrompt includes source label and reference when set', function () {
    config([
        'services.challenge_quiz.grounding.max_chars_per_passage' => 200,
        'services.challenge_quiz.grounding.max_total_chars' => 500,
    ]);

    $p = new ChallengeGroundingPassage([
        'source_type' => 'quran',
        'reference' => '1:1',
        'text' => 'Sample ayah text for quiz grounding.',
    ]);
    $p->id = 5;

    $out = app(ChallengeGroundingService::class)->formatPassagesForPrompt(collect([$p]));

    expect($out)->toContain('[quran]')->toContain('1:1')->toContain('Sample ayah');
});
