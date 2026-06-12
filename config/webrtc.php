<?php

return [

    /*
    |--------------------------------------------------------------------------
    | ICE servers (STUN / TURN) for browser WebRTC
    |--------------------------------------------------------------------------
    |
    | Production calls on mobile/corporate networks need working TURN relay.
    |
    | Recommended (free 20GB/mo): sign up at https://www.metered.ca/tools/openrelay/
    | and set WEBRTC_TURN_API_KEY. Credentials are fetched server-side and cached.
    |
    | Alternative: self-hosted or other TURN — set WEBRTC_TURN_URL(S), USERNAME, CREDENTIAL.
    |
    */

    'turn_api_key' => env('WEBRTC_TURN_API_KEY'),

    'turn_api_url' => env('WEBRTC_TURN_API_URL', 'https://openrelayproject.metered.ca'),

    /** Comma-separated or JSON array, e.g. turn:turn.example.com:3478,turns:turn.example.com:5349 */
    'turn_urls' => env('WEBRTC_TURN_URL'),

    'turn_username' => env('WEBRTC_TURN_USERNAME'),

    'turn_credential' => env('WEBRTC_TURN_CREDENTIAL'),

];
