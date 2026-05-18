<?php

namespace App\Support;

/**
 * BIU short-form video templates (OpenAI prompt builder + UX labels).
 *
 * @return list<array{key: string, label: string}>
 */
final class AiMediaStudioTemplates
{
    public static function all(): array
    {
        return [
            ['key' => 'fundraiser', 'label' => 'Fundraiser video'],
            ['key' => 'church_event', 'label' => 'Church event promo'],
            ['key' => 'volunteer_recruitment', 'label' => 'Volunteer recruitment'],
            ['key' => 'food_drive', 'label' => 'Food drive'],
            ['key' => 'companion_story', 'label' => 'Companion story'],
            ['key' => 'bible_study_invite', 'label' => 'Bible study invite'],
            ['key' => 'testimony', 'label' => 'Testimony video'],
            ['key' => 'community_impact', 'label' => 'Community impact'],
            ['key' => 'merchant_promotion', 'label' => 'Merchant promotion'],
            ['key' => 'course_promotion', 'label' => 'Course promotion'],
        ];
    }
}
