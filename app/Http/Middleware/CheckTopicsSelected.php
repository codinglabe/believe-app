<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckTopicsSelected
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    // CheckTopicsSelected.php
    public function handle(Request $request, Closure $next): Response
    {
        $excludedRoutes = ['topics.select', 'topics.store', 'logout', 'wallet.plans'];

        if (in_array($request->route()->getName(), $excludedRoutes)) {
            return $next($request);
        }

            $user = $request->user();
        
        // Allow admin users to bypass topic selection requirement
        if ($user && $user->role === 'admin') {
            return $next($request);
        }

        if ($user && !$user->interestedTopics()->exists()) {

            // For JSON/API requests, return JSON response instead of redirecting
            if ($request->expectsJson() || $request->wantsJson() || $request->is('api/*') || $request->header('Accept') === 'application/json') {
                return response()->json([
                    'success' => false,
                    'message' => 'Please select your topics to continue.',
                    'redirect' => $user->role === 'organization' || $user->role === 'organization_pending' 
                        ? route('auth.topics.select')
                        : route('user.topics.select'),
                ], 403);
            }

            // Use simple role property check instead of Spatie Permission to avoid guard issues
            // This is more reliable and doesn't depend on guard configuration
            if($user->role === 'organization' || $user->role === 'organization_pending'){
                return redirect()->route('auth.topics.select');
            }elseif($user->role === 'user'){
                return redirect()->route('user.topics.select');
            }

            return $next($request);
        }

        return $next($request);
    }
}
