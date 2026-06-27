<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Unity Call (1:1 audio from chat)
    |--------------------------------------------------------------------------
    |
    | When false, outbound call UI and POST /unity-calls are disabled.
    | Incoming calls and active-call restore still work for in-flight sessions.
    */

    'enabled' => filter_var(env('UNITY_CALL_ENABLED', true), FILTER_VALIDATE_BOOLEAN),

];
