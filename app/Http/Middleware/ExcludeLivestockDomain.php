<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ExcludeLivestockDomain
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Block access to main app routes when on livestock domain
        $livestockDomain = config('livestock.domain');
        
        // Extract hostname from domain (remove protocol if present)
        $domainHost = $livestockDomain;
        if (str_contains($livestockDomain, '://')) {
            $parsed = parse_url($livestockDomain);
            $domainHost = $parsed['host'] ?? $livestockDomain;
        } else {
            // If no protocol, remove any path/port and get just the hostname
            $domainHost = explode('/', $livestockDomain)[0];
            $domainHost = explode(':', $domainHost)[0];
        }
        
        $currentHost = $request->getHost();
        
        // Only block if we're actually on the livestock domain (exact match only)
        // This middleware should only block main app routes when on livestock domain
        if ($currentHost === $domainHost) {
            abort(404, 'Route not found on this domain');
        }

        // Allow the request to proceed on main domain
        return $next($request);
    }
}
