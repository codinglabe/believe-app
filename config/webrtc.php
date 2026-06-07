<?php

return [

    /*
    |--------------------------------------------------------------------------
    | ICE servers (STUN / TURN) for browser WebRTC
    |--------------------------------------------------------------------------
    */

    'ice_servers' => array_values(array_filter([
        ['urls' => 'stun:stun.l.google.com:19302'],
        ['urls' => 'stun:stun1.l.google.com:19302'],
        ['urls' => 'stun:stun.cloudflare.com:3478'],
        env('WEBRTC_TURN_URL') ? [
            'urls' => env('WEBRTC_TURN_URL'),
            'username' => env('WEBRTC_TURN_USERNAME'),
            'credential' => env('WEBRTC_TURN_CREDENTIAL'),
        ] : null,
    ])),

];
