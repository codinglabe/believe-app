<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Supporter birthday notifications (org staff alerts)
    |--------------------------------------------------------------------------
    |
    | When a supporter (role: user) has a birthday, each registered nonprofit
    | they favorite receives an in-app + push alert for its owner and board.
    | The celebrant's local calendar day and send hour are used (users.timezone).
    |
    */

    'enabled' => env('SUPPORTER_BIRTHDAY_NOTIFICATIONS_ENABLED', true),

    /** Local hour (0–23) in the celebrant's timezone when org alerts are sent. */
    'send_hour_local' => (int) env('SUPPORTER_BIRTHDAY_SEND_HOUR_LOCAL', 8),

];
