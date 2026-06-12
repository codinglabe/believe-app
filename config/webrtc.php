<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Self-hosted TURN (coturn on Hostinger VPS) — preferred for Unity calls
    |--------------------------------------------------------------------------
    |
    | WEBRTC_TURN_URL=turn:72.60.226.88:3478,turn:501c3ers.com:3478,turns:501c3ers.com:5349
    | WEBRTC_TURN_USERNAME=believe501c3
    | WEBRTC_TURN_CREDENTIAL=strong-secret
    |
    | Optional Metered API fallback (leave WEBRTC_TURN_API_KEY empty to disable):
    | WEBRTC_TURN_API_KEY=
    */

    'turn_public_ip' => env('WEBRTC_TURN_PUBLIC_IP', '72.60.226.88'),

    'turn_realm' => env('WEBRTC_TURN_REALM', '501c3ers.com'),

    'turn_urls' => env('WEBRTC_TURN_URL'),

    'turn_username' => env('WEBRTC_TURN_USERNAME'),

    'turn_credential' => env('WEBRTC_TURN_CREDENTIAL'),

    'turn_api_key' => env('WEBRTC_TURN_API_KEY'),

    'turn_api_url' => env('WEBRTC_TURN_API_URL', 'https://501c3ers.metered.live'),

    'use_third_party_turn_fallback' => env('WEBRTC_USE_THIRD_PARTY_TURN', false),

];
