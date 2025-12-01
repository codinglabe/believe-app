<?php

namespace App\Http\Controllers\Livestock\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

class LivestockEmailVerificationNotificationController extends Controller
{
    /**
     * Send a new email verification notification for livestock users.
     */
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user('livestock');
        
        if (!$user) {
            return redirect()->route('login');
        }

        if ($user->hasVerifiedEmail()) {
            // Redirect to livestock seller dashboard or home
            if (Route::has('seller.dashboard')) {
                return redirect()->route('seller.dashboard');
            }
            return redirect()->route('home');
        }

        $user->sendEmailVerificationNotification();

        return back()->with('status', 'verification-link-sent');
    }
}

