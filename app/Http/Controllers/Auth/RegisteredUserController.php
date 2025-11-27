<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\SupporterPosition;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Str;

class RegisteredUserController extends Controller
{
    /**
     * Show the registration page.
     */
    public function create(): Response
    {
        return Inertia::render('auth/register');
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:users',
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'agreeToTerms' => 'required|accepted',
            'positions' => 'required|array|min:1',
            'positions.*' => 'exists:supporter_positions,id',
        ]);

        $referredBy = null;
        if ($request->filled('referralCode')) {
            $refUser = User::where('referral_code', $request->referralCode)->first();
            if ($refUser) {
                $referredBy = $refUser->id;
            }
        }

        $slug = Str::slug($request->name);
        if (User::where('slug', $slug)->exists()) {
            $slug .= '-' . Str::random(5);
        }

        $user = User::create([
            'name' => $request->name,
            'slug' => $slug,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => 'user',
            'referred_by' => $referredBy,
        ]);

        // Positions সেভ করুন
        if ($request->has('positions')) {
            $user->supporterPositions()->sync($request->positions);
        }

        event(new Registered($user));
        $user->assignRole('user');

        Auth::login($user);

        return to_route('user.profile.index');
    }
}
