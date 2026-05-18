<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Lets nonprofit dashboard roles open the create-event flow when Spatie permissions are missing
 * or stale, while still requiring the event.create permission for other roles (e.g. regular users).
 */
class EnsureCanCreateEvents
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if ($user === null) {
            abort(403);
        }

        if ($user->hasRole('admin') || $user->can('event.create')) {
            return $next($request);
        }

        if ($user->hasAnyRole(['organization', 'care_alliance', 'organization_pending'])) {
            return $next($request);
        }

        abort(403, 'You do not have permission to create events.');
    }
}
