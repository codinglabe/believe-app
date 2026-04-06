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

        // Check if we're on livestock domain using helper function
        $isLivestockDomain = false;
        if (function_exists('is_livestock_domain')) {
            $isLivestockDomain = is_livestock_domain();
        } else {
            // Fallback: check domain config
            $livestockDomain = config('livestock.domain');
            $domainHost = $livestockDomain;
            if (str_contains($livestockDomain, '://')) {
                $parsed = parse_url($livestockDomain);
                $domainHost = $parsed['host'] ?? $livestockDomain;
            } else {
                $domainHost = explode('/', $livestockDomain)[0];
                $domainHost = explode(':', $domainHost)[0];
            }
            $isLivestockDomain = strtolower($request->getHost()) === strtolower($domainHost);
        }

        // Determine which guard is being used based on domain
        $user = null;
        if ($isLivestockDomain) {
            $user = $request->user('livestock');
        } else {
            $user = $request->user();
        }

        if (!$user) {
            return $next($request);
        }

        // If verification is required, check if user is verified
        if (!$user->hasVerifiedEmail()) {
            // Send email via queue with current domain (where user is accessing from)
            // Use actual request host, not config value
            $scheme = $request->getScheme();
            $host = $request->getHost();
            $port = $request->getPort();
            $currentDomain = $scheme . '://' . $host . ($port && $port != 80 && $port != 443 ? ':' . $port : '');
            $user->sendEmailVerificationNotification($currentDomain);

            // Check if it's an Inertia request (Inertia requests must always get Inertia responses)
            // Inertia requests have X-Inertia header set to 'true'
            $isInertiaRequest = $request->header('X-Inertia') === 'true' || $request->header('X-Inertia-Version') !== null;
            
            // If it's an Inertia request, always redirect (Inertia will handle it)
            if ($isInertiaRequest) {
                if ($isLivestockDomain) {
                    return redirect()->to($request->schemeAndHttpHost() . '/verify-email');
                }
                return redirect()->to($request->schemeAndHttpHost() . '/verify-email');
            }

            // Check if it's a JSON request (fetch/AJAX that expects JSON response)
            // Only return JSON if it's NOT an Inertia request
            $acceptHeader = $request->header('Accept', '');
            $isApiRoute = str_starts_with($request->path(), 'api/');
            $hasJsonAccept = str_contains($acceptHeader, 'application/json');
            $hasHtmlAccept = str_contains($acceptHeader, 'text/html');
            $isAjaxRequest = $request->header('X-Requested-With') === 'XMLHttpRequest';
            
            // For JSON requests: API routes, or AJAX requests with JSON accept (but not HTML)
            // This handles fetch() calls that want JSON responses
            if ($isApiRoute || ($isAjaxRequest && $hasJsonAccept && !$hasHtmlAccept)) {
                return response()->json([
                    'success' => false,
                    'verified' => false,
                    'message' => 'Please verify your email address to continue.',
                    'verification_url' => $request->schemeAndHttpHost() . '/verify-email',
                ], 403);
            }

            // For regular browser requests, redirect to verification page
            // Use absolute URL to ensure we stay on the current domain
            if ($isLivestockDomain) {
                return redirect()->to($request->schemeAndHttpHost() . '/verify-email');
            }
            return redirect()->to($request->schemeAndHttpHost() . '/verify-email');
        }

        return $next($request);
    }
}
