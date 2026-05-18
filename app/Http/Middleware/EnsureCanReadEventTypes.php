<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Aligns with {@see \App\Http\Controllers\EventTypeController::index} so organization /
 * Care Alliance dashboard users can open the catalog even when Spatie permissions are out of sync.
 */
class EnsureCanReadEventTypes
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if ($user === null) {
            abort(403);
        }

        if ($user->can('event_type.read') || $user->hasNonprofitDashboardRole() || $user->hasRole('admin')) {
            return $next($request);
        }

        abort(403, 'You do not have permission to view event types.');
    }
}
