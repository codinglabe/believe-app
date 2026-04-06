<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class EmailVerificationNotificationController extends Controller
{
    /**
     * Send a new email verification notification.
     */
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        
        if ($user->hasVerifiedEmail()) {
            return redirect()->intended(route('dashboard', absolute: false));
        }

        // Send email via queue with current domain (where user is accessing from)
        // Use actual request host, not config value
        $scheme = $request->getScheme();
        $host = $request->getHost();
        $port = $request->getPort();
        $currentDomain = $scheme . '://' . $host . ($port && $port != 80 && $port != 443 ? ':' . $port : '');
        
        // Log for debugging
        Log::info('Resending verification email', [
            'user_id' => $user->id,
            'user_email' => $user->email,
            'request_host' => $host,
            'request_scheme' => $scheme,
            'current_domain' => $currentDomain,
            'request_url' => $request->fullUrl(),
            'config_app_url' => config('app.url'),
        ]);
        
        $user->sendEmailVerificationNotification($currentDomain);

        return back()->with('status', 'verification-link-sent');
    }
}
