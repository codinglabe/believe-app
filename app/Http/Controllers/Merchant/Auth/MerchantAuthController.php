<?php

namespace App\Http\Controllers\Merchant\Auth;

use App\Http\Controllers\Controller;
use App\Models\Merchant;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;

class MerchantAuthController extends Controller
{
    /**
     * Display the registration view.
     */
    public function create(): Response
    {
        return Inertia::render('merchant/Auth/Register');
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:merchants'],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'business_name' => ['nullable', 'string', 'max:255'],
        ]);

        $merchant = Merchant::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => $request->password,
            'business_name' => $request->business_name,
            'status' => 'active',
            'role' => 'merchant',
        ]);

        event(new Registered($merchant));

        Auth::guard('merchant')->login($merchant);

        return redirect()->route('merchant.dashboard', [], 303);
    }

    /**
     * Display the login view.
     */
    public function showLoginForm(Request $request): Response
    {
        return Inertia::render('merchant/Auth/Login', [
            'canResetPassword' => false,
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function login(Request $request): RedirectResponse
    {
        $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (Auth::guard('merchant')->attempt($request->only('email', 'password'), $request->boolean('remember'))) {
            $request->session()->regenerate();

            // Do not use intended(): it may point at the main app and breaks subdomain auth.
            // 303: POST→redirect must not replay POST on the next hop (Inertia only upgrades DELETE etc. to 303).
            $request->session()->forget('url.intended');

            return redirect()->route('merchant.dashboard', [], 303);
        }

        throw \Illuminate\Validation\ValidationException::withMessages([
            'email' => __('The provided credentials do not match our records.'),
        ]);
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('merchant')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('merchant.home');
    }
}
