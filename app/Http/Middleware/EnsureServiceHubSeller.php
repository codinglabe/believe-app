<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Ensures the user has a Service Hub seller profile (not admin-only tooling).
 * Non-sellers are redirected so seller URLs cannot be used manually.
 */
class EnsureServiceHubSeller
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return redirect()->route('login');
        }

        if ($user->role === 'admin') {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Administrators cannot access seller tools from this area.'], 403);
            }

            return redirect()->route('service-hub.index')
                ->with('info', 'Use the admin panel to manage the Service Hub.');
        }

        $user->loadMissing('serviceSellerProfile');

        if (! $user->serviceSellerProfile) {
            if ($request->expectsJson()) {
                return response()->json([
                    'message' => 'Create your seller profile to access this page.',
                    'redirect' => route('service-hub.seller-profile.create'),
                ], 403);
            }

            return redirect()->route('service-hub.seller-profile.create')
                ->with('info', 'Create your seller profile to access the seller dashboard and your sales.');
        }

        return $next($request);
    }
}
