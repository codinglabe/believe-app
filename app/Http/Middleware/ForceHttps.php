<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Redirect HTTP to HTTPS in production so getUserMedia works in embedded meetings
 * (Firefox/Edge treat https iframes in http parents as insecure).
 */
class ForceHttps
{
    public function handle(Request $request, Closure $next): Response
    {
        if (
            ! app()->environment(['local', 'development', 'testing'])
            && ! $request->secure()
        ) {
            return redirect()->secure($request->getRequestUri(), 301);
        }

        return $next($request);
    }
}
