<?php

namespace App\Http\Middleware;

use App\Models\Organization;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Gates access to the Nonprofit Barter Network (NNBN).
 * MVP: organization role + linked org + admin approved (registration_status).
 * Full compliance (EIN, KYB, Bridge, board officer) can be re-enabled when required.
 */
class BarterNetworkAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return redirect()->route('login');
        }

        // Must be organization role
        if (!$user->hasAnyRole(['organization', 'organization_pending'])) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Barter network is only available to approved nonprofits.'], 403);
            }
            abort(403, 'Barter network is only available to approved nonprofits.');
        }

        // Resolve org: board membership (user->organization) or primary account (organizations.user_id)
        $org = $user->organization ?? Organization::where('user_id', $user->id)->first();

        if (!$org) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'No organization linked to this account.'], 403);
            }
            abort(403, 'No organization linked to this account.');
        }

        // Admin approved (registration_status) — required for barter access
        if ($org->registration_status !== 'approved') {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Your organization must be admin-approved to access the barter network.'], 403);
            }
            abort(403, 'Your organization must be admin-approved to access the barter network.');
        }

        // Optional: uncomment to enforce full Ken requirements (EIN, Bridge/KYB, board officer)
        // if (empty($org->ein) || strlen($org->ein) < 9) {
        //     abort(403, 'Organization EIN must be validated to access the barter network.');
        // }
        // $bridge = $org->bridgeIntegration;
        // if (!$bridge || !$bridge->isKYBApproved()) {
        //     abort(403, 'Bridge must be connected and KYB approved to access the barter network.');
        // }
        // if (!BoardMember::where('organization_id', $org->id)->where('is_active', true)->exists()) {
        //     abort(403, 'A board officer must be on file to access the barter network.');
        // }

        $request->attributes->set('barter_organization', $org);

        return $next($request);
    }
}
