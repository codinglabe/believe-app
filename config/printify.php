<?php
return [
    'api_key' => env('PRINTIFY_API_KEY'),
    'base_url' => 'https://api.printify.com/',
    'shop_id' => env('PRINTIFY_SHOP_ID'),
    'webhook_secret' => env('PRINTIFY_WEBHOOK_SECRET'),
    'tax_rate_percentage' => env('PRINTIFY_TAX_RATE_PERCENTAGE', 0),
    'platform_fee' => env('PRINTIFY_PLATFORM_FEE', 3),
    'optional_donation_percentage' => env("PRINTIFY_PRODUCT_DONATION_DEFAULT_PERCENTAGE", 10),
];
