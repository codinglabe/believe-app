<?php

namespace App\Support;

class ChallengeQuestionHasher
{
    public static function hash(
        string $category,
        string $question,
        string $optionA,
        string $optionB,
        string $optionC,
        string $optionD,
    ): string {
        $norm = static function (string $s): string {
            $t = trim(preg_replace('/\s+/u', ' ', $s));

            return mb_strtolower($t, 'UTF-8');
        };

        $payload = $norm($category).'|'.$norm($question).'|'.$norm($optionA).'|'.$norm($optionB).'|'.$norm($optionC).'|'.$norm($optionD);

        return hash('sha256', $payload);
    }
}
