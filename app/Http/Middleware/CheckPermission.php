<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Inertia\Inertia;

class CheckPermission
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = $request->user();

        // If user is not authenticated, redirect to login
        if (!$user) {
            return redirect()->route('login');
        }

        // Check if user has the required permission
        if (!$user->can($permission)) {
            // If it's an AJAX request, return JSON response
            if ($request->expectsJson()) {
                return response()->json([
                    'message' => 'You do not have permission to perform this action.',
                    'permission' => $permission
                ], 403);
            }

            // For web requests, show permission denied page
            return Inertia::render('errors/permission-denied', [
                'permission' => $permission,
                'userRole' => $user->getRoleNames()->first(),
                'requiredPermission' => $permission,
                'backUrl' => $request->header('referer') ?: route('dashboard')
            ])->toResponse($request);
        }

        return $next($request);
    }
}
