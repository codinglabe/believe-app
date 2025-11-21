<?php
return [
    'api_key' => env('PRINTIFY_API_KEY'),
    'base_url' => 'https://api.printify.com/',
    'shop_id' => env('PRINTIFY_SHOP_ID'),
    'webhook_secret' => env('PRINTIFY_WEBHOOK_SECRET'),
    'tax_rate_percentage' => env('PRINTIFY_TAX_RATE_PERCENTAGE', 0),
];
