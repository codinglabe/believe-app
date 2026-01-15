<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\AdminSetting;
use Illuminate\Support\Facades\Log;

/**
 * EnsureApiEmailVerified Middleware
 * 
 * This middleware ensures that authenticated API users have verified their email.
 * Returns JSON responses for API requests instead of redirects.
 * More secure than frontend-only checks as it validates at the API level.
 */
class EnsureApiEmailVerified
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $path = $request->path();
        $method = $request->method();
        
        Log::info('[EnsureApiEmailVerified] Middleware triggered', [
            'path' => $path,
            'method' => $method,
            'ip' => $request->ip(),
        ]);

        // Check if email verification is required from admin settings
        $verificationRequired = AdminSetting::get('email_verification_required', true);
        
        Log::info('[EnsureApiEmailVerified] Verification required check', [
            'verification_required' => $verificationRequired,
        ]);

        // If verification is not required by admin, allow access
        if (!$verificationRequired) {
            Log::info('[EnsureApiEmailVerified] Verification not required - allowing access');
            return $next($request);
        }

        // Get authenticated user (works with both 'api' and 'web' guards)
        $user = $request->user();
        
        Log::info('[EnsureApiEmailVerified] User check', [
            'user_id' => $user?->id,
            'user_email' => $user?->email,
            'has_user' => $user !== null,
        ]);

        // If no user is authenticated, allow through (auth middleware will handle this)
        if (!$user) {
            Log::info('[EnsureApiEmailVerified] No user authenticated - allowing through (auth middleware will handle)');
            return $next($request);
        }

        // Check if email is verified
        $emailVerified = $user->email_verified_at !== null && $user->email_verified_at !== '';
        
        Log::info('[EnsureApiEmailVerified] Email verification check', [
            'user_id' => $user->id,
            'email' => $user->email,
            'email_verified_at' => $user->email_verified_at,
            'is_verified' => $emailVerified,
        ]);

        if (!$emailVerified) {
            Log::warning('[EnsureApiEmailVerified] Email not verified - blocking access', [
                'user_id' => $user->id,
                'email' => $user->email,
                'path' => $path,
            ]);
            
            // Return JSON error response for API requests
            return response()->json([
                'success' => false,
                'message' => 'Please verify your email address to access this resource.',
                'error' => 'EMAIL_NOT_VERIFIED',
                'email_verified_at' => null,
                'requires_verification' => true,
            ], 403);
        }

        // Email is verified, allow request to proceed
        Log::info('[EnsureApiEmailVerified] Email verified - allowing access', [
            'user_id' => $user->id,
            'path' => $path,
        ]);
        
        return $next($request);
    }
}
