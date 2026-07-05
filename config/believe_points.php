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

];
