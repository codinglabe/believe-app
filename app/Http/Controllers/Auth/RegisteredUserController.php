<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
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
        // dd($request->all());
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);


        $referredBy = null;
        if ($request->has('referralCode')) {
            $user = User::where('referral_code', $request->referralCode)->first();
            if ($user) {
                $referredBy = $user->id;
            }
        }

        $slug = Str::slug($request->name);
        if(User::where('slug', $slug)->exists()) {
            $slug = $slug . '-' . Str::random(5);
        }

        $user = User::create([
            'name' => $request->name,
            'slug' => $request->slug,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => 'user',
            'referred_by' => $referredBy,
        ]);

        event(new Registered($user));

        $user->assignRole('user');

        Auth::login($user);

        return to_route('dashboard');
    }
}
