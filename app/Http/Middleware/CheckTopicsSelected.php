<?php

namespace App\Http\Middleware;

use App\Models\Organization;
use Closure;
use Illuminate\Contracts\Support\Responsable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckTopicsSelected
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response|\Illuminate\Contracts\Support\Responsable)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($this->userMustSelectTopics($request)) {
            $user = $request->user();

            if ($this->wantsJsonTopicBlock($request)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Please select your topics to continue.',
                    'redirect' => $user->role === 'organization'
                        ? route('auth.topics.select')
                        : route('user.topics.select'),
                ], 403);
            }

            if ($user->role === 'organization') {
                return redirect()->route('auth.topics.select');
            }
            if ($user->role === 'user') {
                return redirect()->route('user.topics.select');
            }
        }

        return $this->normalizeResponse($request, $next($request));
    }

    /**
     * Redirect supporters/orgs without selected topics to onboarding, or null to continue.
     */
    public function topicSelectionRedirect(Request $request): ?RedirectResponse
    {
        if (! $this->userMustSelectTopics($request)) {
            return null;
        }

        $user = $request->user();

        if ($user->role === 'organization') {
            return redirect()->route('auth.topics.select');
        }
        if ($user->role === 'user') {
            return redirect()->route('user.topics.select');
        }

        return null;
    }

    private function userMustSelectTopics(Request $request): bool
    {
        if (! config('app.require_topics_selection', true)) {
            return false;
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
            return false;
        }

        if ($request->is(
            'profile/topics/select',
            'group-topics/select',
            'user/topics/store',
            'unity-call/*',
            'unity-calls/*',
            'broadcasting/*',
        )) {
            return false;
        }

        $user = $request->user();

        if ($user && $user->role === 'admin') {
            return false;
        }

        if ($user && $user->hasRole('care_alliance') && ! Organization::forAuthUser($user)) {
            return false;
        }

        if ($user && $user->role === 'organization_pending') {
            return false;
        }

        if ($user && ! $user->interestedTopics()->exists()) {
            if (! \App\Models\ChatTopic::query()->exists()) {
                return false;
            }

            return in_array($user->role, ['organization', 'user'], true);
        }

        return false;
    }

    private function wantsJsonTopicBlock(Request $request): bool
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
