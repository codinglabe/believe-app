<?php

namespace App\Http\Controllers;

use App\Support\AppVersion;
use Illuminate\Http\JsonResponse;

class PwaVersionController extends Controller
{
    /**
     * Lightweight version endpoint for installed PWAs (Android/iOS) to detect deploys.
     */
    public function show(): JsonResponse
    {
        return response()
            ->json([
                'version' => AppVersion::current(),
                'builtAt' => AppVersion::builtAt(),
            ])
            ->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            ->header('Pragma', 'no-cache');
    }
}
