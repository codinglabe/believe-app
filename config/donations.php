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
    | organization connects a Standard Stripe account via OAuth.
    |
    */

    'require_org_stripe_connect_for_direct_donations' => env('DONATIONS_REQUIRE_ORG_STRIPE_CONNECT', false),

    /*
    |--------------------------------------------------------------------------
    | Stripe Connect OAuth client ID (Standard accounts)
    |--------------------------------------------------------------------------
    |
    | From Stripe Dashboard → Connect → Settings → OAuth settings (ca_...).
    | Required for organization Standard Connect onboarding.
    |
    */

    'stripe_connect_client_id' => env('STRIPE_CONNECT_CLIENT_ID'),

    /*
    |--------------------------------------------------------------------------
    | Default ISO country hint (legacy / future use)
    |--------------------------------------------------------------------------
    */

    'stripe_connect_default_country' => env('DONATIONS_STRIPE_CONNECT_COUNTRY', 'US'),

];
