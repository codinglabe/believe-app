<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Prevents caching of auth pages (login, register, etc.) by browsers, CDNs, and service workers.
 * Reduces 419 Page Expired (CSRF/session) when users get stale HTML with expired tokens.
 */
class NoCacheAuthPages
{
    /** Paths (first segment or exact) that must not be cached — avoids stale CSRF in PWA. */
    protected array $authPaths = [
        '',
        'login',
        'register',
        'forgot-password',
        'reset-password',
        'verify-email',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $path = trim($request->path(), '/');
        $pathSegments = $path ? explode('/', $path) : [];
        $firstSegment = $pathSegments[0] ?? '';

        foreach ($this->authPaths as $authPath) {
            if ($authPath === '' && $path === '') {
                $response->headers->set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
                $response->headers->set('Pragma', 'no-cache');
                $response->headers->set('Expires', '0');
                return $response;
            }
            if ($authPath !== '' && ($firstSegment === $authPath || $path === $authPath)) {
                $response->headers->set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
                $response->headers->set('Pragma', 'no-cache');
                $response->headers->set('Expires', '0');
                break;
            }
        }

        return $response;
    }
}
