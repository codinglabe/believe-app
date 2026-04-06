<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Laravel\Cashier\Cashier;
use Symfony\Component\HttpFoundation\Response;
use Inertia\Inertia;

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

        if (!$merchant) {
            return redirect()->route('merchant.login');
        }

        // Get current subscription and refresh from Stripe for real-time status
        $subscription = $merchant->subscriptions()
            ->whereIn('stripe_status', ['active', 'trialing', 'canceled'])
            ->orderBy('created_at', 'desc')
            ->first();

        $hasActiveSubscription = false;
        
        if ($subscription) {
            // Real-time check: Refresh subscription status from Stripe
            try {
                if ($subscription->stripe_id) {
                    $stripe = Cashier::stripe();
                    $stripeSubscription = $stripe->subscriptions->retrieve($subscription->stripe_id);
                    
                    // Update local subscription with latest data from Stripe
                    $subscription->stripe_status = $stripeSubscription->status;
                    $subscription->ends_at = $stripeSubscription->cancel_at ? 
                        \Carbon\Carbon::createFromTimestamp($stripeSubscription->cancel_at) : null;
                    $subscription->trial_ends_at = $stripeSubscription->trial_end ? 
                        \Carbon\Carbon::createFromTimestamp($stripeSubscription->trial_end) : null;
                    
                    // If cancel_at is set, mark as canceled even if status is still 'active'
                    if ($stripeSubscription->cancel_at) {
                        $subscription->stripe_status = 'canceled';
                    }
                    
                    $subscription->save();
                    
                    // Check if subscription is truly active (not canceled)
                    $hasActiveSubscription = in_array($stripeSubscription->status, ['active', 'trialing']) 
                        && $stripeSubscription->cancel_at === null;
                }
            } catch (\Exception $e) {
                Log::warning('Failed to refresh subscription status in middleware', [
                    'merchant_id' => $merchant->id,
                    'subscription_id' => $subscription->id,
                    'error' => $e->getMessage(),
                ]);
                
                // Fallback: check local status
                $hasActiveSubscription = in_array($subscription->stripe_status, ['active', 'trialing']) 
                    && $subscription->ends_at === null;
            }
        }

        // If no active subscription, allow only dashboard and subscription routes
        if (!$hasActiveSubscription) {
            // If trying to access dashboard or subscription routes, allow it
            if ($request->routeIs('merchant.dashboard') || $request->routeIs('merchant.subscription.*')) {
                return $next($request);
            }

            // For all other routes, redirect to dashboard with subscription_required flag
            return redirect()->route('merchant.dashboard')
                ->with('subscription_required', true);
        }

        return $next($request);
    }
}
