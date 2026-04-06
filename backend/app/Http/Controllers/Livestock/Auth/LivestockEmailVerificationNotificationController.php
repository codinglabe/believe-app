<?php

namespace App\Http\Controllers\Livestock\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
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

        // Send email via queue with current domain (where user is accessing from)
        // Use actual request host, not config value
        $scheme = $request->getScheme();
        $host = $request->getHost();
        $port = $request->getPort();
        $currentDomain = $scheme . '://' . $host . ($port && $port != 80 && $port != 443 ? ':' . $port : '');
        
        // Log for debugging
        Log::info('Livestock: Resending verification email', [
            'user_id' => $user->id,
            'user_email' => $user->email,
            'request_host' => $host,
            'request_scheme' => $scheme,
            'current_domain' => $currentDomain,
            'request_url' => $request->fullUrl(),
            'config_app_url' => config('app.url'),
            'mailer' => config('mail.default'),
        ]);
        
        $user->sendEmailVerificationNotification($currentDomain);

        return back()->with('status', 'verification-link-sent');
    }
}

