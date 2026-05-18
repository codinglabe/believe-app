<?php

namespace App\Support;

/**
 * Quiz play mode for Level Up / Challenge Hub: difficulty filter + practice (no points).
 */
final class ChallengePlayQuizMode
{
    public const EASY = 'easy';

    public const MEDIUM = 'medium';

    public const HARD = 'hard';

    public const PRACTICE = 'practice';

    /** @return self::EASY|self::MEDIUM|self::HARD|self::PRACTICE */
    public static function normalize(?string $value): string
    {
        $v = is_string($value) ? strtolower(trim($value)) : '';
        $allowed = [self::EASY, self::MEDIUM, self::HARD, self::PRACTICE];
        if ($v === '' || ! in_array($v, $allowed, true)) {
            return self::MEDIUM;
        }

        return $v;
    }

    public static function isPractice(string $mode): bool
    {
        return self::normalize($mode) === self::PRACTICE;
    }

    /**
     * Canonical {@link \App\Models\ChallengeQuestion::difficulty} value for SQL filter, or null for Practice (all difficulties).
     */
    public static function difficultyLabelForQuestions(?string $mode): ?string
    {
        return match (self::normalize($mode)) {
            self::EASY => 'Easy',
            self::MEDIUM => 'Medium',
            self::HARD => 'Hard',
            default => null,
        };
    }
}
