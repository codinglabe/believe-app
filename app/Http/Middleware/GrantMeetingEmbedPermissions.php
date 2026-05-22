<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Allow camera/microphone in cross-origin VDO.Ninja iframes (Permissions-Policy).
 */
class GrantMeetingEmbedPermissions
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->set(
            'Permissions-Policy',
            'camera=*, microphone=*, display-capture=*, fullscreen=*, autoplay=*',
            false
        );

        return $response;
    }
}
