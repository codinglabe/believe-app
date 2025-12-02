<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
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

        $isLivestockDomain = false;

        if (function_exists('is_livestock_domain')) {
            $isLivestockDomain = is_livestock_domain();
        } else {
            // Fallback for development
            $isLivestockDomain = app()->environment('local') &&
                (request()->has('livestock') ||
                    str_contains(request()->url(), 'livestock'));
        }
        $route = $isLivestockDomain
            ? (Route::has('seller.dashboard') ? 'seller.dashboard' : 'home')
            : ($request->user()->role === 'user' ? 'user.profile.index' : 'dashboard');

        return redirect()->intended(route($route));
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return is_livestock_domain()
            ? redirect()->route('home')
            : redirect('/');
    }
}
