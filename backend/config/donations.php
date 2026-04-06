<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Stripe Checkout — automatic tax (Stripe Tax)
    |--------------------------------------------------------------------------
    |
    | When true, donation Checkout Sessions will set automatic_tax.enabled.
    | Requires Stripe Tax to be configured in the Stripe Dashboard.
    |
    */
    'stripe_automatic_tax' => env('DONATIONS_STRIPE_AUTOMATIC_TAX', false),

];
