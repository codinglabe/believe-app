<?php

namespace App\Http\Middleware;

use App\Models\LivestockUser;
use App\Models\Merchant;
use App\Models\Organization;
use App\Models\User;
use App\Services\BridgeVerificationService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureBridgeVerified
{
    /** @var list<string> */
    private const EXEMPT_PATH_PREFIXES = [
        '/wallet',
        '/dashboard',
        '/care-alliance/dashboard',
        '/plans',
        '/logout',
        '/users/stop-impersonate',
        '/organization/care-alliance-invitations',
        '/wallet/kyc-callback',
        '/wallet/kyb-callback',
        '/wallet/tos-callback',
        // Account utilities — must work while org completes Bridge verification
        '/notifications',
        '/push-token',
        '/api/push-notifications',
        '/broadcasting',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user instanceof User || $user instanceof LivestockUser || $user instanceof Merchant) {
            return $next($request);
        }

        if ($user->hasRole('admin') || (string) $user->role === 'admin') {
            return $next($request);
        }

        if (! $user->hasNonprofitDashboardRole()) {
            return $next($request);
        }

        if ($user->current_plan_id === null) {
            return $next($request);
        }

        if ($this->isExempt($request)) {
            return $next($request);
        }

        $organization = Organization::forAuthUser($user);
        $status = BridgeVerificationService::payloadForOrganization($organization);

        if ($status['is_verified']) {
            return $next($request);
        }

        if ($request->expectsJson() || $request->wantsJson() || $request->header('Accept') === 'application/json') {
            return response()->json([
                'success' => false,
                'message' => 'Complete Bridge wallet verification to continue.',
                'requires_bridge_verification' => true,
            ], 403);
        }

        return redirect()->to($this->dashboardUrlFor($user));
    }

    private function dashboardUrlFor(User $user): string
    {
        if ($user->hasRole('care_alliance') || (string) $user->role === 'care_alliance') {
            return route('care-alliance.dashboard');
        }

        return route('dashboard');
    }

    private function isExempt(Request $request): bool
    {
        $path = '/'.ltrim($request->path(), '/');

        foreach (self::EXEMPT_PATH_PREFIXES as $prefix) {
            if ($path === $prefix || str_starts_with($path, $prefix.'/')) {
                return true;
            }
        }

        return false;
    }
}
