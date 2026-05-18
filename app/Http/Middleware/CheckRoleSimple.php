<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRoleSimple
{
    /**
     * Handle an incoming request.
     * Simple role check without Spatie Permission - uses user role property directly
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (!$user) {
            return redirect()->route('login');
        }

        // Check if user has any of the required roles using simple role property
        $userRole = $user->role;

        // Normalize role names (handle organization_pending as organization)
        if ($userRole === 'organization_pending') {
            $userRole = 'organization';
        }

        $hasRole = false;
        foreach ($roles as $role) {
            if ($userRole === $role) {
                $hasRole = true;
                break;
            }
        }

        if (!$hasRole) {
            abort(403, 'You do not have the required role to access this resource.');
        }

        return $next($request);
    }
}

