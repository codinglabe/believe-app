<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
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

        // Redirect users and organizations to their public view pages
        if ($user->role === 'user') {
            // Redirect user to their public profile page
            $slug = $user->slug ?? $user->id;
            return redirect()->intended(route('users.show', $slug));
        } elseif (in_array($user->role, ['organization', 'organization_pending'])) {
            // Redirect organization to their public view page
            $slug = $user->slug ?? $user->id;
            return redirect()->intended(route('organizations.show', $slug));
        }

        // Default redirect for other roles (e.g., admin)
        return redirect()->intended(route('dashboard'));
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
