<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Inertia\Inertia;

class CheckRole
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        // If user is not authenticated, redirect to login
        if (!$user) {
            return redirect()->route('login');
        }

        // Check if user has any of the required roles
        if (!$user->hasAnyRole($roles)) {
            // If it's an AJAX request, return JSON response
            if ($request->expectsJson()) {
                return response()->json([
                    'message' => 'You do not have the required role to access this resource.',
                    'requiredRoles' => $roles,
                    'userRole' => $user->getRoleNames()->first()
                ], 403);
            }

            // For web requests, show permission denied page
            return Inertia::render('errors/permission-denied', [
                'permission' => 'role_access',
                'userRole' => $user->getRoleNames()->first(),
                'requiredRoles' => $roles,
                'backUrl' => $request->header('referer') ?: route('dashboard')
            ])->toResponse($request);
        }

        return $next($request);
    }
}
