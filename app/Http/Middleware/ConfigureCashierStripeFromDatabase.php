<?php

namespace App\Http\Middleware;

use App\Services\StripeConfigService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Ensures Cashier uses Stripe keys + webhook secret from admin payment method settings
 * before Cashier verifies and handles /stripe/webhook.
 */
final class ConfigureCashierStripeFromDatabase
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->is('stripe/webhook') || $request->is('stripe/*')) {
            StripeConfigService::configureStripe();
        }

        return $next($request);
    }
}
