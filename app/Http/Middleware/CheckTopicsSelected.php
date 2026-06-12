<?php

namespace App\Http\Middleware;

use App\Models\Organization;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckTopicsSelected
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! config('app.require_topics_selection', true)) {
            return $next($request);
        }

        $route = $request->route();
        $routeName = $route?->getName();

        $excludedRoutes = [
            'user.topics.select',
            'auth.topics.select',
            'topics.select',
            'user.topics.store',
            'topics.store',
            'logout',
            'wallet.plans',
        ];

        if ($routeName !== null && in_array($routeName, $excludedRoutes, true)) {
            return $next($request);
        }

        // Topic onboarding pages (route names differ between user vs org).
        if ($request->is(
            'profile/topics/select',
            'group-topics/select',
            'user/topics/store',
            'unity-call/*',
            'unity-calls/*',
            'broadcasting/*',
        )) {
            return $next($request);
        }

        $user = $request->user();

        // Allow admin users to bypass topic selection requirement
        if ($user && $user->role === 'admin') {
            return $next($request);
        }

        // Legacy Care Alliance accounts without an organization profile (before unified org provisioning)
        if ($user && $user->hasRole('care_alliance') && ! Organization::forAuthUser($user)) {
            return $next($request);
        }

        // organization_pending: do NOT require topic select yet — they must complete org onboarding (Form 1023 etc.) first. After they become "organization", topic select will be required.
        if ($user && $user->role === 'organization_pending') {
            return $next($request);
        }

        if ($user && ! $user->interestedTopics()->exists()) {
            // No topics in DB — cannot complete onboarding; do not trap users in a redirect loop.
            $hasSelectableTopics = \App\Models\ChatTopic::query()->exists();
            if (! $hasSelectableTopics) {
                return $next($request);
            }

            // For JSON/API requests, return JSON response instead of redirecting
            if ($request->expectsJson() || $request->wantsJson() || $request->is('api/*') || $request->header('Accept') === 'application/json') {
                return response()->json([
                    'success' => false,
                    'message' => 'Please select your topics to continue.',
                    'redirect' => $user->role === 'organization'
                        ? route('auth.topics.select')
                        : route('user.topics.select'),
                ], 403);
            }

            // Require topic select only for organization (approved) and user roles
            if ($user->role === 'organization') {
                return redirect()->route('auth.topics.select');
            }
            if ($user->role === 'user') {
                return redirect()->route('user.topics.select');
            }

            return $next($request);
        }

        return $next($request);
    }
}
