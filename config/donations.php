<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Require Stripe Connect for “plain” organization donations (not Care Alliance splits)
    |--------------------------------------------------------------------------
    |
    | When true, one-time Stripe gifts to nonprofits that are not routed through
    | Care Alliance financial distribution require Connect onboarding before checkout.
    | When false, the app falls back to the legacy platform Checkout flow until the
    | organization connects Stripe Express.
    |
    */

    'require_org_stripe_connect_for_direct_donations' => env('DONATIONS_REQUIRE_ORG_STRIPE_CONNECT', false),

];
