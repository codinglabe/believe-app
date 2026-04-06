<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Alliance Membership / org-side invite flows are for nonprofits joining a Care Alliance,
 * not for users who operate a Care Alliance (Spatie role care_alliance).
 */
class DenyCareAllianceHubUser
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->hasRole('care_alliance')) {
            if ($request->expectsJson() || $request->wantsJson()) {
                return response()->json([
                    'message' => 'This area is for organization alliance membership, not Care Alliance administrators.',
                ], 403);
            }

            return redirect()
                ->route('dashboard')
                ->with('error', 'Alliance Membership is for nonprofits joining an alliance. Use Care Alliance in the sidebar to manage your alliance.');
        }

        return $next($request);
    }
}
