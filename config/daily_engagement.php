<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Daily engagement push notifications
    |--------------------------------------------------------------------------
    |
    | Sent once per day to supporters (role: user) and organization accounts.
    | One message is chosen for the entire day and rotates through the pool.
    |
    */

    'enabled' => env('DAILY_ENGAGEMENT_PUSH_ENABLED', true),

    'title' => env('DAILY_ENGAGEMENT_PUSH_TITLE', env('APP_NAME', 'Believe App')),

    'messages' => [
        '🌟 Make a difference today.',
        '💜 Someone needs your support.',
        '🎁 Check out today\'s opportunities.',
        '🤝 Connect with your community.',
        '📢 New updates are waiting.',
        '🙏 Be a blessing to someone today.',
        '💵 One Dollar Matters.',
        '🌍 Together we create impact.',
        '🎯 Your mission continues today.',
        '❤️ Small actions change lives.',
    ],

];
