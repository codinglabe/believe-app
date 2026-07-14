<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Services\SupporterProfileCompletionService;
use Closure;
use Illuminate\Contracts\Support\Responsable;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Normal supporters (role user) must complete /profile/edit before using the rest of the app.
 */
class EnsureSupporterProfileComplete
{
    /**
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response|\Illuminate\Contracts\Support\Responsable)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($this->shouldForceProfileEdit($request)) {
            if ($this->wantsJsonBlock($request)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Please complete your profile to continue.',
                    'redirect' => route('user.profile.edit'),
                ], 403);
            }

            return redirect()
                ->route('user.profile.edit')
                ->with('info', 'Please complete your profile to continue.');
        }

        return $this->normalizeResponse($request, $next($request));
    }

    private function shouldForceProfileEdit(Request $request): bool
    {
        if (! config('app.require_supporter_profile', true)) {
            return false;
        }

        if (function_exists('request_is_merchant_portal') && request_is_merchant_portal()) {
            return false;
        }

        if (function_exists('is_livestock_domain') && is_livestock_domain()) {
            return false;
        }

        $user = $request->user();
        if (! $user instanceof User) {
            return false;
        }

        if (($user->role ?? null) !== 'user') {
            return false;
        }

        if (! SupporterProfileCompletionService::needsProfileSetup($user)) {
            return false;
        }

        $routeName = $request->route()?->getName();

        $excludedRoutes = [
            'user.profile.edit',
            'user.profile.update',
            'user.profile.primary-organization.change',
            'user.profile.timezone',
            'logout',
            'logout.main',
            'verification.notice',
            'verification.send',
            'verification.verify',
            'password.request',
            'password.email',
            'password.reset',
            'password.store',
            'password.confirm',
            'password.update',
        ];

        if ($routeName !== null && in_array($routeName, $excludedRoutes, true)) {
            return false;
        }

        if ($request->is(
            'profile/edit',
            'profile/update',
            'profile/primary-organization/change',
            'profile/timezone',
            'verify-email',
            'verify-email/*',
            'email/verify/*',
            'logout',
            'unity-call/*',
            'unity-calls/*',
            'broadcasting/*',
        )) {
            return false;
        }

        return true;
    }

    private function wantsJsonBlock(Request $request): bool
    {
        return $request->expectsJson()
            || $request->wantsJson()
            || $request->is('api/*')
            || $request->header('Accept') === 'application/json';
    }

    /**
     * @param  Response|Responsable  $response
     */
    private function normalizeResponse(Request $request, mixed $response): Response
    {
        if ($response instanceof Response) {
            return $response;
        }

        if ($response instanceof Responsable) {
            return $response->toResponse($request);
        }

        throw new \InvalidArgumentException('Middleware closure must return a Symfony or Responsable response.');
    }
}
