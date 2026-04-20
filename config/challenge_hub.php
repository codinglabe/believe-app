<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Timed quiz play — per-question limit (seconds)
    |--------------------------------------------------------------------------
    */
    'question_time_limit_seconds' => max(1, (int) env('CHALLENGE_QUIZ_QUESTION_SECONDS', 10)),

    /*
    | Streak bonus at end of a completed quiz run (max streak − 1) × tier, capped.
    */
    'streak_bonus_per_streak_tier' => (float) env('CHALLENGE_QUIZ_STREAK_BONUS_PER_TIER', 10),
    'streak_bonus_cap' => (float) env('CHALLENGE_QUIZ_STREAK_BONUS_CAP', 30),

    /*
    |--------------------------------------------------------------------------
    | Quiz card images (when no entry / track image)
    |--------------------------------------------------------------------------
    |
    | Used on the View Challenges page when a card has no image_url. Override in
    | production or point to your own CDN via publishing this config.
    |
    */
    'quiz_card_fallback_images' => [
        'https://images.unsplash.com/photo-1504052434569-70adf0d03729?auto=format&fit=crop&w=720&q=80',
        'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=720&q=80',
        'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=720&q=80',
        'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=720&q=80',
        'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=720&q=80',
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=720&q=80',
        'https://images.unsplash.com/photo-1465146344425-f00d78f5c621?auto=format&fit=crop&w=720&q=80',
        'https://images.unsplash.com/photo-1518709268805-4e9042af2176?auto=format&fit=crop&w=720&q=80',
        'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?auto=format&fit=crop&w=720&q=80',
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=720&q=80',
    ],

    /*
    |--------------------------------------------------------------------------
    | View Challenges — empty state
    |--------------------------------------------------------------------------
    */
    'challenges_empty_heading' => env(
        'CHALLENGE_CHALLENGES_EMPTY_HEADING',
        'No quizzes are available for this challenge yet.'
    ),

    'challenges_empty_hint' => env(
        'CHALLENGE_CHALLENGES_EMPTY_HINT',
        'Check back soon or open the Challenge Hub for more topics.'
    ),

];
