<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Models\User;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Laravel\Cashier\Cashier;

class PlansController extends Controller
{
    /**
     * Display the plans page
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $currentPlan = null;
        
        if ($user && $user->current_plan_id) {
            $currentPlan = Plan::with('features')->find($user->current_plan_id);
        }

        $plans = Plan::with('features')
            ->active()
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
                    'features' => $plan->features->map(function ($feature) {
                        return [
                            'id' => $feature->id,
                            'name' => $feature->name,
                            'description' => $feature->description,
                            'icon' => $feature->icon,
                            'is_unlimited' => $feature->is_unlimited,
                        ];
                    }),
                ];
            });

        // Static add-ons (can be moved to database later)
        $addOns = [
            [
                'name' => 'Email Re-Ups',
                'price' => '$1 per 1,000 emails',
                'description' => 'Perfect for growth and newsletters',
            ],
            [
                'name' => 'AI Packs',
                'price' => '$5 per 50,000 tokens',
                'description' => 'High margin; encourages use',
            ],
            [
                'name' => 'SMS',
                'price' => '$0.015 per text',
                'description' => 'Opt-in only',
            ],
            [
                'name' => 'Extra Storage',
                'price' => '$0.20/GB',
                'description' => 'For big media orgs',
            ],
            [
                'name' => 'Raffles Platform Fee',
                'price' => '4% of raised funds',
                'description' => 'Direct revenue',
            ],
            [
                'name' => 'Volunteer Background Checks',
                'price' => '$6 each',
                'description' => 'Optional',
            ],
        ];

        $currentPlanData = null;
        if ($currentPlan) {
            $currentPlanData = [
                'id' => $currentPlan->id,
                'name' => $currentPlan->name,
                'price' => (float) $currentPlan->price,
                'frequency' => $currentPlan->frequency,
            ];
        }

        return Inertia::render('Plans/Index', [
            'plans' => $plans,
            'addOns' => $addOns,
            'currentPlan' => $currentPlanData,
        ]);
    }

    /**
     * Handle plan subscription
     */
    public function subscribe(Request $request, Plan $plan)
    {
        $user = $request->user();

        if (!$user) {
            return redirect()->route('login');
        }

        try {
            // Calculate total amount including Currency custom fields
            $totalAmount = (float) $plan->price;
            $currencyFields = [];
            $oneTimeItems = [];

            // Process custom fields
            if ($plan->custom_fields && is_array($plan->custom_fields)) {
                foreach ($plan->custom_fields as $field) {
                    if ($field['type'] === 'currency') {
                        $currencyAmount = (float) $field['value'];
                        $totalAmount += $currencyAmount;
                        $currencyFields[] = [
                            'label' => $field['label'],
                            'amount' => $currencyAmount,
                        ];
                        $oneTimeItems[] = [
                            'price_data' => [
                                'currency' => 'usd',
                                'product_data' => [
                                    'name' => $field['label'],
                                ],
                                'unit_amount' => (int)($currencyAmount * 100),
                            ],
                            'quantity' => 1,
                        ];
                    }
                }
            }

            // Create Stripe checkout session
            $checkoutOptions = [
                'success_url' => route('plans.success') . '?session_id={CHECKOUT_SESSION_ID}&plan_id=' . $plan->id,
                'cancel_url' => route('plans.index'),
                'metadata' => [
                    'user_id' => $user->id,
                    'plan_id' => $plan->id,
                    'type' => 'plan_subscription',
                ],
                'payment_method_types' => ['card'],
            ];

            // If plan is recurring (not one-time), create subscription with one-time items
            if ($plan->frequency !== 'one-time' && $plan->stripe_price_id) {
                // For subscriptions with one-time charges, we need to use Stripe Checkout directly
                $stripe = Cashier::stripe();
                
                $lineItems = [
                    [
                        'price' => $plan->stripe_price_id,
                        'quantity' => 1,
                    ]
                ];
                
                // Add one-time currency fields as line items
                foreach ($oneTimeItems as $item) {
                    $lineItems[] = $item;
                }
                
                $checkoutSessionData = [
                    'payment_method_types' => ['card'],
                    'mode' => 'subscription',
                    'line_items' => $lineItems,
                    'subscription_data' => [
                        'metadata' => [
                            'plan_id' => $plan->id,
                            'user_id' => $user->id,
                        ],
                    ],
                    'success_url' => $checkoutOptions['success_url'],
                    'cancel_url' => $checkoutOptions['cancel_url'],
                    'metadata' => $checkoutOptions['metadata'],
                    'allow_promotion_codes' => true,
                ];

                // Add trial period if configured
                if ($plan->trial_days && $plan->trial_days > 0) {
                    $checkoutSessionData['subscription_data']['trial_period_days'] = $plan->trial_days;
                }

                // Only use customer OR customer_email, not both
                if ($user->stripe_id) {
                    $checkoutSessionData['customer'] = $user->stripe_id;
                } else {
                    $checkoutSessionData['customer_email'] = $user->email;
                }

                $checkoutSession = $stripe->checkout->sessions->create($checkoutSessionData);
                
                return Inertia::location($checkoutSession->url);
            } else {
                // One-time payment
                $amountInCents = (int)($totalAmount * 100);
                $checkout = $user->checkoutCharge(
                    $amountInCents,
                    "Purchase {$plan->name} Plan" . (!empty($currencyFields) ? ' + Add-ons' : ''),
                    1,
                    array_merge($checkoutOptions, [
                        'line_items' => $oneTimeItems,
                    ])
                );
                
                return Inertia::location($checkout->url);
            }
        } catch (\Exception $e) {
            Log::error('Plan subscription error', [
                'error' => $e->getMessage(),
                'user_id' => $user->id,
                'plan_id' => $plan->id,
            ]);

            return redirect()->back()->withErrors([
                'message' => 'Failed to create checkout session. Please try again.',
            ]);
        }
    }

    /**
     * Handle successful plan subscription
     */
    public function success(Request $request)
    {
        try {
            $sessionId = $request->query('session_id');
            $planId = $request->query('plan_id');

            if (!$sessionId || !$planId) {
                return redirect()->route('plans.index')->with('error', 'Invalid session.');
            }

            $user = $request->user();
            $plan = Plan::findOrFail($planId);

            // Retrieve the checkout session from Stripe
            $session = Cashier::stripe()->checkout->sessions->retrieve($sessionId);

            if ($session->payment_status !== 'paid') {
                return redirect()->route('plans.index')->with('error', 'Payment was not completed.');
            }

            // Calculate total amount including Currency custom fields
            $totalAmount = (float) $plan->price;
            $currencyFields = [];
            $emailsIncluded = 0;
            $aiTokensIncluded = 0;
            $creditsToAdd = 0;

            // Process custom fields
            if ($plan->custom_fields && is_array($plan->custom_fields)) {
                foreach ($plan->custom_fields as $field) {
                    $fieldKey = strtolower($field['key'] ?? '');
                    $fieldType = $field['type'] ?? '';
                    $fieldValue = $field['value'] ?? '';
                    $fieldLabel = strtolower($field['label'] ?? '');

                    // Handle emails_included - check by key or label
                    if (($fieldKey === 'emails_included' || str_contains($fieldLabel, 'email')) && $fieldType === 'number') {
                        // Remove commas and convert to integer
                        $emailsIncluded = (int) str_replace(',', '', $fieldValue);
                    }
                    // Handle ai_tokens_included - check by key or label containing 'token' or 'ai'
                    elseif (($fieldKey === 'ai_tokens_included' || 
                             $fieldKey === 'ai_tokens' || 
                             str_contains($fieldKey, 'token') ||
                             (str_contains($fieldLabel, 'token') || str_contains($fieldLabel, 'ai assistant'))) && 
                            $fieldType === 'number') {
                        // Remove commas and convert to integer
                        $aiTokensIncluded = (int) str_replace(',', '', $fieldValue);
                    }
                    // Handle currency fields
                    elseif ($fieldType === 'currency') {
                        $currencyAmount = (float) $fieldValue;
                        $totalAmount += $currencyAmount;
                        $currencyFields[] = [
                            'label' => $field['label'],
                            'amount' => $currencyAmount,
                        ];
                    }
                    // Handle credits - only if explicitly marked as credits (not tokens, not emails)
                    elseif (($fieldKey === 'credits' || str_contains($fieldLabel, 'credit')) && 
                            $fieldType === 'number' &&
                            !str_contains($fieldKey, 'token') &&
                            !str_contains($fieldLabel, 'token')) {
                        $creditsToAdd += (int) str_replace(',', '', $fieldValue);
                    }
                }
            }

            // Prepare current_plan_details as JSON
            $planDetails = [
                'name' => $plan->name,
                'price' => (float) $plan->price,
                'frequency' => $plan->frequency,
                'subscribed_at' => now()->toIso8601String(),
                'emails_included' => $emailsIncluded,
                'ai_tokens_included' => $aiTokensIncluded,
                'custom_fields' => $plan->custom_fields ?? [],
            ];

            // Update user with plan, emails, tokens, and credits
            $user->update([
                'current_plan_id' => $plan->id,
                'current_plan_details' => $planDetails,
                'emails_included' => $emailsIncluded,
                'ai_tokens_included' => $aiTokensIncluded,
            ]);

            // Add credits: ai_tokens_included + any explicit credits
            $totalCreditsToAdd = $aiTokensIncluded + $creditsToAdd;
            if ($totalCreditsToAdd > 0) {
                $user->increment('credits', $totalCreditsToAdd);
            }

            // Record transaction for billing history
            $user->recordTransaction([
                'type' => 'purchase',
                'amount' => $totalAmount,
                'payment_method' => 'stripe',
                'status' => 'completed',
                'transaction_id' => $session->payment_intent ?? $sessionId,
                'meta' => [
                    'plan_id' => $plan->id,
                    'plan_name' => $plan->name,
                    'plan_price' => (float) $plan->price,
                    'plan_frequency' => $plan->frequency,
                    'currency_fields' => $currencyFields,
                    'emails_included' => $emailsIncluded,
                    'ai_tokens_included' => $aiTokensIncluded,
                    'credits_added' => $totalCreditsToAdd,
                    'description' => "Plan Subscription: {$plan->name}" . (!empty($currencyFields) ? ' + Add-ons' : ''),
                    'stripe_session_id' => $sessionId,
                    'stripe_payment_intent' => $session->payment_intent ?? null,
                ],
                'related_id' => $plan->id,
                'related_type' => Plan::class,
            ]);

            Log::info('Plan subscription successful', [
                'user_id' => $user->id,
                'plan_id' => $plan->id,
                'emails_included' => $emailsIncluded,
                'ai_tokens_included' => $aiTokensIncluded,
                'credits_added' => $totalCreditsToAdd,
                'total_amount' => $totalAmount,
                'session_id' => $sessionId,
            ]);

            $successMessage = "Successfully subscribed to {$plan->name}!";
            if ($totalCreditsToAdd > 0) {
                $successMessage .= " {$totalCreditsToAdd} credits added.";
            }
            if ($emailsIncluded > 0) {
                $successMessage .= " {$emailsIncluded} emails included.";
            }
            
            return redirect()->route('plans.index')->with('success', $successMessage);
        } catch (\Exception $e) {
            Log::error('Plan subscription success handler error', [
                'error' => $e->getMessage(),
                'session_id' => $request->query('session_id'),
            ]);

            return redirect()->route('plans.index')->with('error', 'Error processing subscription. Please contact support.');
        }
    }

    /**
     * Cancel user's subscription
     */
    public function cancel(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return redirect()->route('login');
        }

        if (!$user->current_plan_id) {
            return redirect()->route('plans.index')->with('error', 'You do not have an active subscription.');
        }

        try {
            // Get plan details before clearing
            $plan = Plan::find($user->current_plan_id);
            $planName = $plan ? $plan->name : 'Plan';

            // Cancel Stripe subscription if exists
            $stripe = Cashier::stripe();
            $subscriptionCancelled = false;
            
            // First, try to find subscription in Laravel Cashier database
            $localSubscriptions = $user->subscriptions()->get();
            
            foreach ($localSubscriptions as $subscription) {
                if ($subscription->stripe_status === 'active' || $subscription->stripe_status === 'trialing') {
                    try {
                        // Cancel immediately (no refund)
                        $subscription->cancelNow();
                        $subscriptionCancelled = true;
                        Log::info('Subscription cancelled via Laravel Cashier', [
                            'subscription_id' => $subscription->stripe_id,
                            'user_id' => $user->id,
                        ]);
                    } catch (\Exception $e) {
                        Log::warning('Failed to cancel subscription via cancelNow', [
                            'subscription_id' => $subscription->stripe_id,
                            'error' => $e->getMessage(),
                        ]);
                        
                        // Try direct Stripe API cancellation
                        try {
                            $stripe->subscriptions->cancel($subscription->stripe_id);
                            $subscriptionCancelled = true;
                            Log::info('Subscription cancelled directly via Stripe API', [
                                'subscription_id' => $subscription->stripe_id,
                                'user_id' => $user->id,
                            ]);
                        } catch (\Exception $stripeError) {
                            Log::error('Failed to cancel Stripe subscription directly', [
                                'subscription_id' => $subscription->stripe_id,
                                'error' => $stripeError->getMessage(),
                            ]);
                        }
                    }
                }
            }
            
            // If no subscription found in database, try to get it from Stripe directly
            if (!$subscriptionCancelled) {
                try {
                    $stripeCustomerId = $user->stripe_id;
                    
                    // If user doesn't have stripe_id, try to find customer by email
                    if (!$stripeCustomerId) {
                        $customers = $stripe->customers->all([
                            'email' => $user->email,
                            'limit' => 1,
                        ]);
                        
                        if (count($customers->data) > 0) {
                            $stripeCustomerId = $customers->data[0]->id;
                            // Store stripe_id for future use
                            $user->update(['stripe_id' => $stripeCustomerId]);
                        }
                    }
                    
                    // Get all active subscriptions for this customer from Stripe
                    if ($stripeCustomerId) {
                        $stripeSubscriptions = $stripe->subscriptions->all([
                            'customer' => $stripeCustomerId,
                            'status' => 'all',
                            'limit' => 100,
                        ]);
                        
                        foreach ($stripeSubscriptions->data as $stripeSubscription) {
                            // Only cancel active or trialing subscriptions
                            if ($stripeSubscription->status === 'active' || $stripeSubscription->status === 'trialing') {
                                try {
                                    // Cancel immediately (no refund)
                                    $stripe->subscriptions->cancel($stripeSubscription->id);
                                    $subscriptionCancelled = true;
                                    
                                    Log::info('Subscription cancelled directly from Stripe', [
                                        'subscription_id' => $stripeSubscription->id,
                                        'customer_id' => $stripeCustomerId,
                                        'user_id' => $user->id,
                                        'status' => $stripeSubscription->status,
                                    ]);
                                } catch (\Exception $e) {
                                    Log::error('Failed to cancel Stripe subscription', [
                                        'subscription_id' => $stripeSubscription->id,
                                        'error' => $e->getMessage(),
                                    ]);
                                }
                            }
                        }
                    }
                } catch (\Exception $e) {
                    Log::error('Error retrieving subscriptions from Stripe', [
                        'user_id' => $user->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            // Clear user's plan (this will make sidebar card visible again)
            $user->update([
                'current_plan_id' => null,
                'current_plan_details' => null,
            ]);

            // Record cancellation transaction
            $user->recordTransaction([
                'type' => 'cancellation',
                'amount' => 0,
                'payment_method' => 'stripe',
                'status' => 'completed',
                'meta' => [
                    'plan_id' => $plan ? $plan->id : null,
                    'plan_name' => $planName,
                    'cancelled_at' => now()->toIso8601String(),
                    'no_refund' => true,
                    'description' => "Subscription Cancelled: {$planName}",
                ],
                'related_id' => $plan ? $plan->id : null,
                'related_type' => $plan ? Plan::class : null,
            ]);

            Log::info('Plan subscription cancelled', [
                'user_id' => $user->id,
                'plan_id' => $plan ? $plan->id : null,
            ]);

            return redirect()->route('plans.index')->with('success', "Your subscription to {$planName} has been cancelled. No refund will be issued.");
        } catch (\Exception $e) {
            Log::error('Plan cancellation error', [
                'error' => $e->getMessage(),
                'user_id' => $user->id,
            ]);

            return redirect()->route('plans.index')->with('error', 'Failed to cancel subscription. Please contact support.');
        }
    }
}

