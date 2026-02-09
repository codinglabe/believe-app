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

        // organization_pending: do NOT require topic select yet — they must complete org onboarding (Form 1023 etc.) first. After they become "organization", topic select will be required.
        if ($user && $user->role === 'organization_pending') {
            return $next($request);
        }

        if ($user && !$user->interestedTopics()->exists()) {

            // For JSON/API requests, return JSON response instead of redirecting
            if ($request->expectsJson() || $request->wantsJson() || $request->is('api/*') || $request->header('Accept') === 'application/json') {
                return response()->json([
                    'success' => false,
                    'message' => 'Please select your topics to continue.',
                    'redirect' => $user->role === 'organization'
                        ? route('auth.topics.select')
                        : route('user.topics.select'),
                ], 403);
            }

            // Require topic select only for organization (approved) and user roles
            if ($user->role === 'organization') {
                return redirect()->route('auth.topics.select');
            }
            if ($user->role === 'user') {
                return redirect()->route('user.topics.select');
            }

            return $next($request);
        }

        return $next($request);
    }
}
