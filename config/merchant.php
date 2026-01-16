<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Merchant Domain
    |--------------------------------------------------------------------------
    |
    | This is the domain where the merchant program will be hosted.
    | All merchant routes will only be accessible on this domain.
    |
    */

    'domain' => env('MERCHANT_DOMAIN', 'merchant.believeinunity.org'),

    /*
    |--------------------------------------------------------------------------
    | Merchant Name
    |--------------------------------------------------------------------------
    |
    | This is the name that will be displayed in emails and other communications
    | sent from the merchant domain.
    |
    */

    'name' => env('MERCHANT_NAME', 'Merchant'),
];

