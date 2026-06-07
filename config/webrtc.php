<?php

$turnFromEnv = (env('WEBRTC_TURN_URL') && env('WEBRTC_TURN_USERNAME') && env('WEBRTC_TURN_CREDENTIAL'))
    ? [
        'urls' => env('WEBRTC_TURN_URL'),
        'username' => env('WEBRTC_TURN_USERNAME'),
        'credential' => env('WEBRTC_TURN_CREDENTIAL'),
    ]
    : null;

return [

    /*
    |--------------------------------------------------------------------------
    | ICE servers (STUN / TURN) for browser WebRTC
    |--------------------------------------------------------------------------
    | TURN is required for many mobile / corporate networks. OpenRelay is a
    | public fallback; set WEBRTC_TURN_* in .env for your own TURN server.
    */

    'ice_servers' => array_values(array_filter([
        ['urls' => 'stun:stun.l.google.com:19302'],
        ['urls' => 'stun:stun1.l.google.com:19302'],
        ['urls' => 'stun:stun.cloudflare.com:3478'],
        $turnFromEnv,
        [
            'urls' => 'turn:openrelay.metered.ca:80',
            'username' => 'openrelayproject',
            'credential' => 'openrelayproject',
        ],
        [
            'urls' => 'turn:openrelay.metered.ca:443',
            'username' => 'openrelayproject',
            'credential' => 'openrelayproject',
        ],
        [
            'urls' => 'turns:openrelay.metered.ca:443?transport=tcp',
            'username' => 'openrelayproject',
            'credential' => 'openrelayproject',
        ],
    ], fn ($entry) => is_array($entry) && ! empty($entry['urls']))),

];
