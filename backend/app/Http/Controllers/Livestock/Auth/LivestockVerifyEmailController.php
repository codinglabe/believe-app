<?php

namespace App\Http\Controllers\Livestock\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Auth\Events\Verified;
use App\Http\Requests\Livestock\EmailVerificationRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Route;

class LivestockVerifyEmailController extends Controller
{
    /**
     * Mark the authenticated livestock user's email address as verified.
     */
    public function __invoke(EmailVerificationRequest $request): RedirectResponse
    {
        $user = $request->user('livestock');
        
        if (!$user) {
            return redirect()->route('login');
        }

        if ($user->hasVerifiedEmail()) {
            // Redirect to livestock seller dashboard or home
            if (Route::has('seller.dashboard')) {
                return redirect()->route('seller.dashboard')->with('verified', true);
            }
            return redirect()->route('home')->with('verified', true);
        }

        if ($user->markEmailAsVerified()) {
            event(new Verified($user));
        }

        // Redirect to livestock seller dashboard or home
        if (Route::has('seller.dashboard')) {
            return redirect()->route('seller.dashboard')->with('verified', true);
        }
        return redirect()->route('home')->with('verified', true);
    }
}

