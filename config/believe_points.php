<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Bridge reserve confirmation (BP purchase settlement gate 2)
    |--------------------------------------------------------------------------
    |
    | When false, purchased BP becomes Available after Stripe funds clear (gate 1)
    | only. Bridge reserve credit matching code remains but is not enforced.
    |
    | Set BP_BRIDGE_RESERVE_CONFIRMATION_ENABLED=true in .env to enforce gate 2 again.
    |
    */

    'bridge_reserve_confirmation_enabled' => env('BP_BRIDGE_RESERVE_CONFIRMATION_ENABLED', false),

    /*
    |--------------------------------------------------------------------------
    | Gift invite holding window
    |--------------------------------------------------------------------------
    |
    | When BP is gifted to an email that is not yet registered, points move from
    | Available → Holding. If the invitee does not register within this many
    | days, Holding is refunded to the sender.
    |
    | 14 days balances enough time to register (including weekends) without
    | leaving sender funds locked for too long.
    |
    */

    'gift_invite_hold_days' => (int) env('BP_GIFT_INVITE_HOLD_DAYS', 14),

    /*
    |--------------------------------------------------------------------------
    | Cancellation goodwill BRP
    |--------------------------------------------------------------------------
    |
    | When a sender cancels (or changes the email on) a pending gift invite,
    | the former recipient email is offered this many Believe Reward Points
    | if they later create a free supporter account with that email.
    |
    */

    'gift_invite_cancellation_brp' => (float) env('BP_GIFT_INVITE_CANCELLATION_BRP', 10),

    /*
    |--------------------------------------------------------------------------
    | Resend cooldown (minutes)
    |--------------------------------------------------------------------------
    */

    'gift_invite_resend_cooldown_minutes' => (int) env('BP_GIFT_INVITE_RESEND_COOLDOWN_MINUTES', 2),

];
