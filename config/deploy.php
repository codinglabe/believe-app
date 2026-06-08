<?php

return [

    /*
    |--------------------------------------------------------------------------
    | GitHub Actions runner CSF allow (deploy preflight)
    |--------------------------------------------------------------------------
    | Set DEPLOY_RUNNER_ALLOW_TOKEN in .env and the same value as GitHub secret
    | DEPLOY_RUNNER_ALLOW_TOKEN. On the VPS, allow www user to run scripts/allow-runner-ip.sh
    | via sudoers (see scripts/allow-runner-ip.sh header).
    */

    'runner_allow_token' => env('DEPLOY_RUNNER_ALLOW_TOKEN'),

];
