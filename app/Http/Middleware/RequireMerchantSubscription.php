<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireMerchantSubscription
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $merchant = $request->user('merchant');

        if (! $merchant) {
            return redirect()->route('merchant.login');
        }

        // Subscription enforcement is disabled for now — merchants on the free plan can access all features.
        return $next($request);
    }
}
