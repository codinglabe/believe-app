<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Helpers\AuthRedirectHelper;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EmailVerificationPromptController extends Controller
{
    /**
     * Show the email verification prompt page.
     */
    public function __invoke(Request $request): Response|RedirectResponse
    {
        if ($request->user()->hasVerifiedEmail()) {
            $url = AuthRedirectHelper::defaultRedirectForUser($request->user());
            return redirect()->intended($url);
        }
        return Inertia::render('auth/verify-email', ['status' => $request->session()->get('status')]);
    }
}
