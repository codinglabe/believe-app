<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Broadcaster
    |--------------------------------------------------------------------------
    |
    | This option controls the default broadcaster that will be used by the
    | framework when an event needs to be broadcast. You may set this to
    | any of the connections defined in the "connections" array below.
    |
    | Supported: "reverb", "pusher", "ably", "redis", "log", "null"
    |
    */

    'default' => env('BROADCAST_CONNECTION', 'null'),

    /*
    |--------------------------------------------------------------------------
    | Broadcast Connections
    |--------------------------------------------------------------------------
    |
    | Here you may define all of the broadcast connections that will be used
    | to broadcast events to other systems or over websockets. Samples of
    | each available type of connection are provided inside this array.
    |
    */

    'connections' => [

        'reverb' => [
            'driver' => 'reverb',
            'key' => env('REVERB_APP_KEY'),
            'secret' => env('REVERB_APP_SECRET'),
            'app_id' => env('REVERB_APP_ID'),
            // Browser uses REVERB_* (often https + public host). PHP may use REVERB_BROADCAST_* loopback
            // on ForgeStack local to avoid .test TLS verify errors (cURL 60).
            'options' => [
                'host' => env('REVERB_BROADCAST_HOST', env('REVERB_HOST')),
                'port' => (int) env('REVERB_BROADCAST_PORT', env('REVERB_PORT', 8080)),
                'scheme' => env('REVERB_BROADCAST_SCHEME', env('REVERB_SCHEME', 'http')),
                'useTLS' => env('REVERB_BROADCAST_SCHEME', env('REVERB_SCHEME', 'http')) === 'https',
            ],
            'client_options' => array_filter([
                'verify' => env('REVERB_CAFILE')
                    ?: (env('APP_ENV') === 'local' && filter_var(env('REVERB_VERIFY_SSL', true), FILTER_VALIDATE_BOOL) === false
                        ? false
                        : null),
            ], fn ($value) => $value !== null),
        ],

        'pusher' => [
            'driver' => 'pusher',
            'key' => env('PUSHER_APP_KEY'),
            'secret' => env('PUSHER_APP_SECRET'),
            'app_id' => env('PUSHER_APP_ID'),
            'options' => [
                'cluster' => env('PUSHER_APP_CLUSTER'),
                'host' => env('PUSHER_HOST') ?: 'api-' . env('PUSHER_APP_CLUSTER', 'mt1') . '.pusherapp.com',
                'port' => env('PUSHER_PORT', 443),
                'scheme' => env('PUSHER_SCHEME', 'https'),
                'encrypted' => true,
                'useTLS' => env('PUSHER_SCHEME', 'https') === 'https',
            ],
            'client_options' => [
                // Guzzle client options: https://docs.guzzlephp.org/en/stable/request-options.html
            ],
        ],

        'ably' => [
            'driver' => 'ably',
            'key' => env('ABLY_KEY'),
        ],

        'log' => [
            'driver' => 'log',
        ],

        'null' => [
            'driver' => 'null',
        ],

    ],

];
