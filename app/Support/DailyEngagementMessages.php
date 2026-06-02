<?php

namespace App\Support;

use Carbon\CarbonInterface;

class DailyEngagementMessages
{
    /**
     * Pick the engagement message for a calendar day (same message for all users that day).
     *
     * @return array{index: int, body: string}
     */
    public static function forDate(?CarbonInterface $date = null): array
    {
        $date = $date ?? now();
        $messages = config('daily_engagement.messages', []);

        if ($messages === []) {
            return [
                'index' => 0,
                'body' => '🌟 Make a difference today.',
            ];
        }

        $index = ((int) $date->format('z')) % count($messages);

        return [
            'index' => $index,
            'body' => (string) $messages[$index],
        ];
    }
}
