<?php
// app/Http/Middleware/EnsureEmailIsVerified.php

namespace App\Http\Middleware;

use App\Models\AdminSetting;
use Closure;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureEmailIsVerified
{
    public function handle(Request $request, Closure $next): Response
    {
        // Check if email verification is required from admin settings
        $verificationRequired = AdminSetting::get('email_verification_required', true);

        // If verification is not required by admin, skip verification check
        if (!$verificationRequired) {
            return $next($request);
        }

        // If verification is required, check if user is verified
        if (!$request->user()->hasVerifiedEmail()) {
            $request->user()->sendEmailVerificationNotification();

            return redirect()->route('verification.notice');
        }

        return $next($request);
    }
}
