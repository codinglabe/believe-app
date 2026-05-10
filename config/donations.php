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

    /*
    |--------------------------------------------------------------------------
    | Default ISO country for new Stripe Connect Express accounts
    |--------------------------------------------------------------------------
    |
    | Two-letter country code used when the platform creates a fresh Express
    | Connect account for a nonprofit. Stripe restricts which countries are
    | available; default to "US" for the BIU rollout. Override per-deployment
    | via DONATIONS_STRIPE_CONNECT_COUNTRY when expanding to a new market.
    |
    */

    'stripe_connect_default_country' => env('DONATIONS_STRIPE_CONNECT_COUNTRY', 'US'),

];
