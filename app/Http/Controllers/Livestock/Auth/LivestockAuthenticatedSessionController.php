<?php

namespace App\Http\Controllers\Livestock\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Livestock\LoginRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class LivestockAuthenticatedSessionController extends Controller
{
    /**
     * Show the login page.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('Livestock/Auth/Login', [
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

        $user = $request->user('livestock');
        
        // If user is a buyer (has buyer profile but no seller profile), redirect to home/marketplace
        if ($user->buyerProfile && !$user->sellerProfile) {
            return redirect()->intended(route('home'));
        }
        
        // If user is a seller (has seller profile), redirect to seller dashboard
        if ($user->sellerProfile) {
            $route = Route::has('seller.dashboard') ? 'seller.dashboard' : 'home';
            return redirect()->intended(route($route));
        }
        
        // Default to home
        return redirect()->intended(route('home'));
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('livestock')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('home');
    }
}
