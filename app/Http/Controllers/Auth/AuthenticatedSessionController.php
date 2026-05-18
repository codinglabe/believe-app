<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Helpers\AuthRedirectHelper;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\UserPushToken;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /**
     * Show the login page.
     */
    public function create(Request $request): Response
    {
        if ($request->filled('redirect')) {
            $request->session()->put('url.intended', $request->redirect);
        }

        return Inertia::render('auth/login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        $request->session()->regenerate();

        $user = $request->user();
        $isLivestockDomain = false;

        if (function_exists('is_livestock_domain')) {
            $isLivestockDomain = is_livestock_domain();
        } else {
            // Fallback for development
            $isLivestockDomain = app()->environment('local') &&
                (request()->has('livestock') ||
                    str_contains(request()->url(), 'livestock'));
        }

        // Handle livestock domain redirects
        if ($isLivestockDomain) {
            $route = Route::has('seller.dashboard') ? 'seller.dashboard' : 'home';
            return redirect()->intended(route($route));
        }

        // Single redirect rule: supporter → public view, organization (and pending) → public view, admin → dashboard
        $defaultUrl = AuthRedirectHelper::defaultRedirectForUser($user);
        return redirect()->intended($defaultUrl);
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $user = $request->user();

        // Delete all push tokens for the user before logging out
        if ($user) {
            UserPushToken::where('user_id', $user->id)->delete();
        }

        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return is_livestock_domain()
            ? redirect()->route('home')
            : redirect('/');
    }
}
