<?php

namespace App\Support;

final class ProfileReligions
{
    /**
     * Allowed values for {@see User::$religion} on profile edit (major world religions).
     *
     * @var list<string>
     */
    public const OPTIONS = [
        'Christianity',
        'Islam',
        'Hinduism',
        'Buddhism',
        'Judaism',
        'Sikhism',
        'Taoism',
        'Confucianism',
        'Shinto',
    ];

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return self::OPTIONS;
    }

    /**
     * Normalize a stored profile value to a known option, or null if unset/invalid.
     */
    public static function nullableAllowed(?string $value): ?string
    {
        if ($value === null || trim($value) === '') {
            return null;
        }

        $t = trim($value);

        return in_array($t, self::OPTIONS, true) ? $t : null;
    }

    /**
     * OpenAI prompt block so generated quiz rows match the learner's profile religion (stored on {@see \App\Models\ChallengeQuestion::$religion}).
     */
    public static function challengeQuizPromptAlignment(?string $profileReligion): string
    {
        if ($profileReligion === null) {
            return <<<'TXT'


Learner profile: no religious tradition selected. For faith or scripture-style categories, keep questions broadly usable; do not centre one tradition's canon unless the hub challenge title explicitly names it.
TXT;
        }

        return match ($profileReligion) {
            'Islam' => <<<'TXT'


CRITICAL — Learner profile: Islam. Every question MUST be appropriate for Muslims: draw on the Qur'an, hadith/sunnah where relevant, seerah, Islamic history, fiqh basics, or Arabic/Qur'anic literacy as fits the category and hub challenge. Do NOT write questions whose answers depend mainly on the Hebrew Bible, Old Testament Israelite monarchy (e.g. "first king of Israel"), New Testament, or Christian church history — those are wrong for this learner even if the category says Faith or Scripture. If the challenge is Qur'an-focused, use Qur'an and Islamic sources only.
TXT,
            'Christianity' => <<<'TXT'


CRITICAL — Learner profile: Christianity. Questions must align with Christian scripture and tradition as appropriate to the category. Do not centre Islamic-only or Qur'an-only trivia unless the hub challenge explicitly compares traditions.
TXT,
            'Judaism' => <<<'TXT'


CRITICAL — Learner profile: Judaism. Use Tanakh, rabbinic context, and Jewish history/practice as appropriate. Do not substitute Christian or Islamic canon as the primary frame unless the challenge title requires comparison.
TXT,
            default => "\n\nCRITICAL — Learner profile: {$profileReligion}. All questions and answers must be accurate and primary for this religious tradition; avoid centring other traditions' exclusive scriptures or narratives.",
        };
    }
}
