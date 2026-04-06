<?php

namespace App\Http\Controllers\Merchant;

use App\Http\Controllers\Controller;
use App\Models\MerchantSubscriptionPlan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Laravel\Cashier\Cashier;

class MerchantSubscriptionController extends Controller
{
    /**
     * Display the subscription plans page
     */
    public function index(Request $request)
    {
        $merchant = $request->user('merchant');

        if (!$merchant) {
            return redirect()->route('merchant.login');
        }

        // Get current subscription - only active, trialing, or past_due (not canceled)
        $currentSubscription = $merchant->subscriptions()
            ->whereIn('stripe_status', ['active', 'trialing', 'past_due'])
            ->orderBy('created_at', 'desc')
            ->first();

        $currentPlan = null;
        $isCanceled = false;
        $endsAt = null;
        
        if ($currentSubscription) {
            // Refresh subscription from Stripe to get latest status (dynamic)
            try {
                if ($currentSubscription->stripe_id) {
                    $stripe = Cashier::stripe();
                    $stripeSubscription = $stripe->subscriptions->retrieve($currentSubscription->stripe_id);
                    
                    // Update local subscription with latest data from Stripe
                    $currentSubscription->stripe_status = $stripeSubscription->status;
                    $currentSubscription->ends_at = $stripeSubscription->cancel_at ? 
                        \Carbon\Carbon::createFromTimestamp($stripeSubscription->cancel_at) : null;
                    $currentSubscription->save();
                    
                    // Check if subscription is canceled
                    $isCanceled = $stripeSubscription->status === 'canceled' || 
                                 ($stripeSubscription->cancel_at !== null);
                    $endsAt = $currentSubscription->ends_at?->toIso8601String();
                }
            } catch (\Exception $e) {
                \Log::warning('Failed to refresh subscription from Stripe', [
                    'merchant_id' => $merchant->id,
                    'subscription_id' => $currentSubscription->id,
                    'error' => $e->getMessage(),
                ]);
                
                // Fallback: check local status
                $isCanceled = $currentSubscription->stripe_status === 'canceled' || 
                             ($currentSubscription->ends_at && $currentSubscription->ends_at->isPast());
                $endsAt = $currentSubscription->ends_at?->toIso8601String();
            }

            // Only set current plan if subscription is not canceled
            if (!$isCanceled) {
                $currentPlan = MerchantSubscriptionPlan::where('stripe_price_id', $currentSubscription->stripe_price)->first();
            } else {
                // If canceled, don't show as current plan
                $currentSubscription = null;
            }
        }

        $plans = MerchantSubscriptionPlan::active()
            ->ordered()
            ->get()
            ->map(function ($plan) {
                return [
                    'id' => $plan->id,
                    'name' => $plan->name,
                    'price' => (float) $plan->price,
                    'frequency' => $plan->frequency,
                    'is_popular' => $plan->is_popular,
                    'description' => $plan->description,
                    'trial_days' => (int) ($plan->trial_days ?? 0),
                    'custom_fields' => $plan->custom_fields ?? [],
                ];
            });

        $currentPlanData = null;
        if ($currentPlan) {
            $currentPlanData = [
                'id' => $currentPlan->id,
                'name' => $currentPlan->name,
                'price' => (float) $currentPlan->price,
                'frequency' => $currentPlan->frequency,
            ];
        }

        return Inertia::render('merchant/Subscription/Index', [
            'plans' => $plans,
            'currentPlan' => $currentPlanData,
            'hasActiveSubscription' => $currentSubscription !== null && !$isCanceled,
            'subscriptionEndsAt' => $endsAt,
            'isCanceled' => $isCanceled,
        ]);
    }

    /**
     * Handle plan subscription
     */
    public function subscribe(Request $request, $plan)
    {
        $merchant = $request->user('merchant');

        if (!$merchant) {
            return redirect()->route('merchant.login');
        }

        $plan = MerchantSubscriptionPlan::findOrFail($plan);

        try {
            // Ensure Stripe price exists, create if not
            if (!$plan->stripe_price_id) {
                // Create Stripe product and price using Cashier
                $stripe = Cashier::stripe();
                
                if (!$plan->stripe_product_id) {
                    $product = $stripe->products->create([
                        'name' => "Merchant: {$plan->name}",
                        'description' => $plan->description ?? '',
                    ]);
                    $plan->stripe_product_id = $product->id;
                }

                $interval = $plan->frequency === 'yearly' ? 'year' : 'month';
                $price = $stripe->prices->create([
                    'product' => $plan->stripe_product_id,
                    'unit_amount' => (int)($plan->price * 100),
                    'currency' => 'usd',
                    'recurring' => [
                        'interval' => $interval,
                    ],
                ]);
                
                $plan->stripe_price_id = $price->id;
                $plan->save();
            }

            // Use Cashier's Stripe client to create checkout session
            $stripe = Cashier::stripe();

            $checkoutSessionData = [
                'payment_method_types' => ['card'],
                'mode' => 'subscription',
                'line_items' => [
                    [
                        'price' => $plan->stripe_price_id,
                        'quantity' => 1,
                    ]
                ],
                'subscription_data' => [
                    'metadata' => [
                        'plan_id' => $plan->id,
                        'merchant_id' => $merchant->id,
                    ],
                ],
                'success_url' => route('merchant.subscription.success') . '?session_id={CHECKOUT_SESSION_ID}&plan_id=' . $plan->id,
                'cancel_url' => route('merchant.subscription.index'),
                'metadata' => [
                    'merchant_id' => $merchant->id,
                    'plan_id' => $plan->id,
                    'type' => 'merchant_subscription',
                ],
                'allow_promotion_codes' => true,
            ];

            // Check if merchant has ever completed a trial or had an active subscription
            // Only check for subscriptions that actually went through (not just canceled ones)
            $hasCompletedTrial = $merchant->subscriptions()
                ->whereNotNull('trial_ends_at')
                ->whereNotNull('stripe_id')
                ->exists();
            
            // Check for truly active subscriptions (not canceled, not ended)
            // A subscription is considered active if:
            // 1. Status is 'active' or 'trialing' (not 'canceled', 'past_due', or 'incomplete')
            // 2. AND it doesn't have an ends_at date (meaning it's not scheduled to cancel)
            // 3. AND it's not canceled
            $hasActiveSubscription = $merchant->subscriptions()
                ->whereIn('stripe_status', ['active', 'trialing'])
                ->where('stripe_status', '!=', 'canceled') // Explicitly exclude canceled
                ->whereNull('ends_at') // Not scheduled to cancel
                ->whereNotNull('stripe_id')
                ->exists();
            
            // Apply trial if:
            // 1. Plan has trial days configured
            // 2. Merchant doesn't currently have an active subscription (not canceled, not ended)
            // Note: We allow trial even if merchant had a canceled subscription before
            // Stripe will handle preventing duplicate trials if the customer already used one
            $shouldApplyTrial = $plan->trial_days && 
                               $plan->trial_days > 0 && 
                               !$hasActiveSubscription;
            
            if ($shouldApplyTrial) {
                $checkoutSessionData['subscription_data']['trial_period_days'] = $plan->trial_days;
                
                // Configure trial settings to ensure proper behavior
                $checkoutSessionData['subscription_data']['trial_settings'] = [
                    'end_behavior' => [
                        'missing_payment_method' => 'cancel', // Cancel subscription if no payment method by trial end
                    ],
                ];
            }

            // Use customer if exists, otherwise use email
            if ($merchant->stripe_id) {
                $checkoutSessionData['customer'] = $merchant->stripe_id;
            } else {
                $checkoutSessionData['customer_email'] = $merchant->email;
            }
            
            // Log the checkout session data for debugging
            Log::info('Merchant subscription checkout session created', [
                'merchant_id' => $merchant->id,
                'plan_id' => $plan->id,
                'plan_trial_days' => $plan->trial_days,
                'trial_applied' => $shouldApplyTrial,
                'trial_days_in_session' => $shouldApplyTrial ? $plan->trial_days : 0,
                'has_completed_trial' => $hasCompletedTrial,
                'has_active_subscription' => $hasActiveSubscription,
                'merchant_stripe_id' => $merchant->stripe_id,
                'checkout_session_subscription_data' => $checkoutSessionData['subscription_data'] ?? null,
            ]);

            // Create checkout session using Cashier's Stripe client
            $checkoutSession = $stripe->checkout->sessions->create($checkoutSessionData);

            return Inertia::location($checkoutSession->url);
        } catch (\Exception $e) {
            Log::error('Merchant subscription error', [
                'error' => $e->getMessage(),
                'merchant_id' => $merchant->id,
                'plan_id' => $plan->id,
            ]);

            return redirect()->back()->withErrors([
                'message' => 'Failed to create checkout session. Please try again.',
            ]);
        }
    }

    /**
     * Handle successful subscription
     */
    public function success(Request $request)
    {
        $merchant = $request->user('merchant');

        if (!$merchant) {
            return redirect()->route('merchant.login');
        }

        $sessionId = $request->query('session_id');
        $planId = $request->query('plan_id');

        if ($sessionId) {
            try {
                $stripe = Cashier::stripe();
                $session = $stripe->checkout->sessions->retrieve($sessionId);

                // When using Checkout Sessions with mode='subscription', Stripe creates the subscription
                // Cashier will automatically sync it via webhooks, but we sync it here for immediate access
                if ($session->subscription) {
                    try {
                        // Ensure merchant has stripe_id (required for Cashier)
                        if (!$merchant->stripe_id && $session->customer) {
                            $merchant->stripe_id = $session->customer;
                            $merchant->save();
                        }

                        // Use Cashier's subscription relationship to find or create
                        $subscription = $merchant->subscriptions()->firstOrNew([
                            'stripe_id' => $session->subscription,
                        ]);

                        // If subscription doesn't exist, retrieve from Stripe using Cashier and sync
                        if (!$subscription->exists) {
                            $stripeSubscription = Cashier::stripe()->subscriptions->retrieve($session->subscription);

                            // Use Cashier's subscription model properties
                            $subscription->type = 'default';
                            $subscription->stripe_id = $stripeSubscription->id;
                            $subscription->stripe_status = $stripeSubscription->status;
                            $subscription->stripe_price = $planId ? MerchantSubscriptionPlan::find($planId)?->stripe_price_id : ($stripeSubscription->items->data[0]->price->id ?? null);
                            $subscription->quantity = $stripeSubscription->items->data[0]->quantity ?? 1;
                            $subscription->trial_ends_at = $stripeSubscription->trial_end ?
                                \Carbon\Carbon::createFromTimestamp($stripeSubscription->trial_end) : null;
                            $subscription->ends_at = $stripeSubscription->cancel_at ?
                                \Carbon\Carbon::createFromTimestamp($stripeSubscription->cancel_at) : null;
                            $subscription->user_type = \App\Models\Merchant::class; // Set polymorphic type

                            $subscription->save();
                        }
                    } catch (\Exception $e) {
                        Log::error('Failed to sync subscription', [
                            'error' => $e->getMessage(),
                            'merchant_id' => $merchant->id,
                            'session_id' => $sessionId,
                        ]);
                    }
                }
            } catch (\Exception $e) {
                Log::error('Failed to retrieve checkout session', [
                    'error' => $e->getMessage(),
                    'session_id' => $sessionId,
                ]);
            }
        }

        return Inertia::render('merchant/Subscription/Success', [
            'planId' => $planId,
        ]);
    }

    /**
     * Cancel the merchant's subscription
     */
    public function cancel(Request $request)
    {
        $merchant = $request->user('merchant');

        if (!$merchant) {
            return redirect()->route('merchant.settings')->with('flash', [
                'error' => 'Unauthorized'
            ]);
        }

        try {
            // Get current active subscription
            $subscription = $merchant->subscriptions()
                ->whereIn('stripe_status', ['active', 'trialing', 'past_due'])
                ->orderBy('created_at', 'desc')
                ->first();

            if (!$subscription) {
                return redirect()->route('merchant.settings')->with('flash', [
                    'error' => 'No active subscription found'
                ]);
            }

            // Cancel at end of billing period (not immediately)
            // This allows the merchant to continue using the service until the period ends
            $subscription->cancel();

            // Refresh subscription from Stripe to get updated ends_at and status
            try {
                if ($subscription->stripe_id) {
                    $stripe = Cashier::stripe();
                    $stripeSubscription = $stripe->subscriptions->retrieve($subscription->stripe_id);
                    
                    // Update with latest data from Stripe
                    $subscription->stripe_status = $stripeSubscription->status;
                    $subscription->ends_at = $stripeSubscription->cancel_at ? 
                        \Carbon\Carbon::createFromTimestamp($stripeSubscription->cancel_at) : null;
                    
                    // If cancel_at is set, the subscription is scheduled to cancel
                    // Update status to reflect this (status might still be 'active' but with cancel_at set)
                    if ($stripeSubscription->cancel_at) {
                        // Status will be 'active' until period ends, then becomes 'canceled'
                        // But we mark it as 'canceled' in our system since it's scheduled to cancel
                        $subscription->stripe_status = 'canceled';
                    }
                    
                    $subscription->save();
                }
            } catch (\Exception $e) {
                Log::warning('Failed to refresh subscription after cancellation', [
                    'subscription_id' => $subscription->id,
                    'error' => $e->getMessage(),
                ]);
            }

            Log::info('Merchant subscription cancelled', [
                'merchant_id' => $merchant->id,
                'subscription_id' => $subscription->id,
                'stripe_subscription_id' => $subscription->stripe_id,
            ]);

            return redirect()->route('merchant.settings')->with('flash', [
                'success' => 'Subscription cancelled successfully. It will remain active until the end of the billing period.'
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to cancel merchant subscription', [
                'merchant_id' => $merchant->id,
                'error' => $e->getMessage(),
            ]);

            return redirect()->route('merchant.settings')->with('flash', [
                'error' => 'Failed to cancel subscription. Please try again or contact support.'
            ]);
        }
    }
}
