<?php

namespace App\Http\Controllers\Livestock\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class LivestockEmailVerificationPromptController extends Controller
{
    /**
     * Show the email verification prompt page for livestock users.
     */
    public function __invoke(Request $request): Response|RedirectResponse
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

        return Inertia::render('Livestock/Auth/VerifyEmail', [
            'status' => $request->session()->get('status')
        ]);
    }
}

