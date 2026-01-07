<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Models\WalletPlan;
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

        // Get all wallet plan stripe_price_ids to exclude them from regular plans
        $walletPlanPriceIds = WalletPlan::whereNotNull('stripe_price_id')
            ->pluck('stripe_price_id')
            ->toArray();

        $plans = Plan::with('features')
            ->active()
            ->ordered()
            ->when(!empty($walletPlanPriceIds), function ($query) use ($walletPlanPriceIds) {
                // Exclude plans that have a matching stripe_price_id in wallet_plans table
                $query->whereNotIn('stripe_price_id', $walletPlanPriceIds);
            })
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

        // If API request (but NOT Inertia request), return JSON
        // Inertia requests also send X-Requested-With header, so we need to check for X-Inertia header
        $isInertiaRequest = $request->header('X-Inertia') !== null;
        if (!$isInertiaRequest && ($request->wantsJson() || $request->expectsJson())) {
            return response()->json([
                'success' => true,
                'plans' => $plans,
            ]);
        }

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
                                'unit_amount' => (int) ($currencyAmount * 100),
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
                $amountInCents = (int) ($totalAmount * 100);
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
     * Get wallet plans for API
     */
    public function getWalletPlans(Request $request)
    {
        try {
            // Always fetch fresh data from database (no cache)
            $plansCollection = WalletPlan::active()
                ->ordered()
                ->get();

            // Get monthly plan for savings calculation
            $monthlyPlan = $plansCollection->firstWhere('frequency', 'monthly');

            $plans = $plansCollection->map(function ($plan) use ($monthlyPlan) {
                // Calculate savings for annual plans by comparing with monthly plan
                $savings = null;
                if ($plan->frequency === 'annually' && $monthlyPlan) {
                    $monthlyYearlyCost = $monthlyPlan->price * 12;
                    $calculatedSavings = $monthlyYearlyCost - $plan->price;
                    if ($calculatedSavings > 0) {
                        $savings = (float) $calculatedSavings;
                    }
                }

                return [
                    'id' => $plan->id,
                    'name' => $plan->name,
                    'price' => (float) $plan->price,
                    'one_time_fee' => $plan->one_time_fee ? (float) $plan->one_time_fee : null,
                    'frequency' => $plan->frequency,
                    'description' => $plan->description,
                    'trial_days' => (int) ($plan->trial_days ?? 0),
                    'savings' => $savings,
                ];
            });

            return response()->json([
                'success' => true,
                'plans' => $plans,
            ], 200, [
                'Content-Type' => 'application/json',
                'Cache-Control' => 'no-cache, no-store, must-revalidate',
                'Pragma' => 'no-cache',
                'Expires' => '0',
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch wallet plans', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch wallet plans',
                'plans' => [],
            ], 500, [
                'Content-Type' => 'application/json',
                'Cache-Control' => 'no-cache, no-store, must-revalidate',
                'Pragma' => 'no-cache',
                'Expires' => '0',
            ]);
        }
    }

    /**
     * Handle wallet subscription payment
     */
    public function subscribeWallet(Request $request, WalletPlan $walletPlan)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Please login first.',
            ], 401);
        }

        try {
            // Check if user already has an active subscription
            if ($user->current_plan_id && $user->subscribed()) {
                return response()->json([
                    'success' => false,
                    'message' => 'You already have an active subscription.',
                ], 400);
            }

            // Create Stripe product and price if they don't exist
            if (!$walletPlan->stripe_price_id) {
                try {
                    $stripe = Cashier::stripe();

                    // Create product if not exists
                    if (!$walletPlan->stripe_product_id) {
                        $product = $stripe->products->create([
                            'name' => $walletPlan->name . ' Wallet Plan',
                            'description' => $walletPlan->description ?? 'Wallet Subscription Plan',
                        ]);
                        $walletPlan->stripe_product_id = $product->id;
                    }

                    // Create price
                    $interval = $walletPlan->frequency === 'annually' ? 'year' : 'month';

                    $price = $stripe->prices->create([
                        'product' => $walletPlan->stripe_product_id,
                        'unit_amount' => (int) ($walletPlan->price * 100), // Convert to cents
                        'currency' => 'usd',
                        'recurring' => [
                            'interval' => $interval,
                        ],
                    ]);
                    $walletPlan->stripe_price_id = $price->id;
                    $walletPlan->save();

                    Log::info('Auto-created Stripe product and price for wallet plan', [
                        'wallet_plan_id' => $walletPlan->id,
                        'stripe_product_id' => $walletPlan->stripe_product_id,
                        'stripe_price_id' => $walletPlan->stripe_price_id,
                    ]);
                } catch (\Exception $e) {
                    Log::error('Failed to create Stripe product/price for wallet plan', [
                        'wallet_plan_id' => $walletPlan->id,
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString(),
                    ]);

                    return response()->json([
                        'success' => false,
                        'message' => 'Payment configuration error. Please contact support.',
                    ], 500);
                }
            }

            // Get KYC Verification Fee from database (wallet plan one_time_fee)
            $kycFeeAmount = $walletPlan->one_time_fee ? (float) $walletPlan->one_time_fee : 0;

            // Check if user has already paid KYC fee
            $hasPaidKycFee = Transaction::where('user_id', $user->id)
                ->where('type', 'kyc_fee')
                ->where('status', 'completed')
                ->exists();

            // Use Laravel Cashier's Stripe client for wallet subscription with mixed line items
            // (subscription + one-time KYC verification fee)
            $stripe = Cashier::stripe();

            $lineItems = [
                ['price' => $walletPlan->stripe_price_id, 'quantity' => 1]
            ];

            // Add one-time KYC verification fee if it exists and user hasn't paid it yet
            if ($kycFeeAmount > 0 && !$hasPaidKycFee) {
                $lineItems[] = [
                    'price_data' => [
                        'currency' => 'usd',
                        'product_data' => [
                            'name' => 'KYC Verification Fee',
                            'description' => 'One-time KYC verification fee for wallet access',
                        ],
                        'unit_amount' => (int) ($kycFeeAmount * 100), // Convert to cents
                    ],
                    'quantity' => 1,
                ];
            }

            // Use Cashier's Stripe client to create checkout session
            $checkoutSessionData = [
                'payment_method_types' => ['card'],
                'mode' => 'subscription',
                'line_items' => $lineItems,
                'subscription_data' => [
                    'metadata' => [
                        'wallet_plan_id' => $walletPlan->id,
                        'user_id' => $user->id,
                        'subscription_type' => 'wallet_access',
                    ],
                ],
                'success_url' => route('wallet.subscription.success') . '?session_id={CHECKOUT_SESSION_ID}&wallet_plan_id=' . $walletPlan->id,
                'cancel_url' => route('wallet.subscription.cancel'),
                'metadata' => [
                    'user_id' => $user->id,
                    'wallet_plan_id' => $walletPlan->id,
                    'type' => 'wallet_subscription',
                    'subscription_type' => 'wallet_access',
                    'kyc_fee_included' => ($kycFeeAmount > 0 && !$hasPaidKycFee) ? 'true' : 'false',
                    'kyc_fee_amount' => ($kycFeeAmount > 0 && !$hasPaidKycFee) ? (string) $kycFeeAmount : '0',
                ],
                'allow_promotion_codes' => true,
            ];

            // Add trial period if configured
            if ($walletPlan->trial_days && $walletPlan->trial_days > 0) {
                $checkoutSessionData['subscription_data']['trial_period_days'] = $walletPlan->trial_days;
            }

            // Set customer using Cashier's Stripe client
            if ($user->stripe_id) {
                $checkoutSessionData['customer'] = $user->stripe_id;
            } else {
                $checkoutSessionData['customer_email'] = $user->email;
            }

            // Use Cashier's Stripe client to create checkout session
            $checkoutSession = $stripe->checkout->sessions->create($checkoutSessionData);

            Log::info('Wallet subscription checkout created', [
                'user_id' => $user->id,
                'wallet_plan_id' => $walletPlan->id,
                'session_id' => $checkoutSession->id,
            ]);

            // Use Inertia location to redirect to Stripe checkout
            return Inertia::location($checkoutSession->url);

        } catch (\Exception $e) {
            $errorMessage = $e->getMessage();
            $errorClass = get_class($e);
            
            Log::error('Wallet subscription error', [
                'error' => $errorMessage,
                'error_class' => $errorClass,
                'trace' => $e->getTraceAsString(),
                'user_id' => $user->id ?? null,
                'wallet_plan_id' => $walletPlan->id ?? null,
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            // Provide more specific error messages based on exception type
            $userFriendlyMessage = 'Failed to create checkout session. Please try again.';
            
            // Check for Stripe-specific errors
            if (str_contains($errorClass, 'Stripe') || str_contains($errorMessage, 'Stripe')) {
                if (str_contains($errorMessage, 'No such price')) {
                    $userFriendlyMessage = 'Payment configuration error. The selected plan is not properly configured. Please contact support.';
                } elseif (str_contains($errorMessage, 'No such product')) {
                    $userFriendlyMessage = 'Payment configuration error. The plan product is missing. Please contact support.';
                } elseif (str_contains($errorMessage, 'Invalid')) {
                    $userFriendlyMessage = 'Invalid payment configuration. Please contact support.';
                } else {
                    $userFriendlyMessage = 'Payment service error. Please try again or contact support.';
                }
            } elseif (str_contains($errorMessage, 'Connection') || str_contains($errorMessage, 'timeout')) {
                $userFriendlyMessage = 'Connection error. Please check your internet connection and try again.';
            }

            return response()->json([
                'success' => false,
                'message' => $userFriendlyMessage,
                'error' => config('app.debug') ? $errorMessage : null,
                'error_type' => config('app.debug') ? $errorClass : null,
            ], 500);
        }
    }

    /**
     * Handle successful wallet subscription
     */
    public function walletSubscriptionSuccess(Request $request)
    {
        try {
            $sessionId = $request->query('session_id');
            $walletPlanId = $request->query('wallet_plan_id');
            $user = $request->user();

            if (!$sessionId || !$walletPlanId || !$user) {
                return redirect()->route('plans.index')->withErrors([
                    'message' => 'Invalid session. Please try subscribing again.',
                ]);
            }

            // Use Cashier's method to retrieve checkout session
            $session = Cashier::stripe()->checkout->sessions->retrieve($sessionId);

            if ($session->payment_status === 'paid' || $session->payment_status === 'no_payment_required') {
                $walletPlan = WalletPlan::findOrFail($walletPlanId);

                // Get KYC Verification Fee from database (wallet plan one_time_fee)
                $kycFeeAmount = $walletPlan->one_time_fee ? (float) $walletPlan->one_time_fee : 0;

                // Check if KYC fee was included in the payment
                $kycFeeIncluded = $session->metadata->kyc_fee_included ?? 'false';
                $kycFeeAmountFromSession = (float) ($session->metadata->kyc_fee_amount ?? '0');

                // Record KYC fee transaction if it was paid and not already recorded
                $hasPaidKycFee = Transaction::where('user_id', $user->id)
                    ->where('type', 'kyc_fee')
                    ->where('status', 'completed')
                    ->exists();

                if ($kycFeeAmount > 0 && $kycFeeIncluded === 'true' && $kycFeeAmountFromSession > 0 && !$hasPaidKycFee) {
                    // Record KYC fee transaction
                    Transaction::create([
                        'user_id' => $user->id,
                        'type' => 'kyc_fee',
                        'status' => 'completed',
                        'amount' => $kycFeeAmountFromSession,
                        'currency' => 'USD',
                        'payment_method' => 'stripe',
                        'transaction_id' => $session->payment_intent ?? $sessionId,
                        'meta' => [
                            'stripe_session_id' => $sessionId,
                            'wallet_plan_id' => $walletPlan->id,
                            'description' => 'One-time KYC verification fee',
                        ],
                        'processed_at' => now(),
                    ]);
                }

                // IMPORTANT: Store subscription in database using Laravel Cashier's built-in methods
                // When using Checkout Sessions with mode='subscription', Stripe creates the subscription
                // Cashier will automatically sync it via webhooks, but we sync it here for immediate access
                if ($session->subscription) {
                    try {
                        // Ensure user has stripe_id (required for Cashier)
                        if (!$user->stripe_id && $session->customer) {
                            $user->stripe_id = $session->customer;
                            $user->save();
                        }

                        // Use Cashier's subscription relationship to find or create
                        $subscription = $user->subscriptions()->firstOrNew([
                            'stripe_id' => $session->subscription,
                        ]);

                        // If subscription doesn't exist, retrieve from Stripe and sync using Cashier
                        if (!$subscription->exists) {
                            $stripeSubscription = Cashier::stripe()->subscriptions->retrieve($session->subscription);
                            
                            // Use Cashier's subscription model properties
                            $subscription->type = 'wallet_access';
                            $subscription->stripe_id = $stripeSubscription->id;
                            $subscription->stripe_status = $stripeSubscription->status;
                            $subscription->stripe_price = $walletPlan->stripe_price_id;
                            $subscription->quantity = $stripeSubscription->items->data[0]->quantity ?? 1;
                            $subscription->trial_ends_at = $stripeSubscription->trial_end ? 
                                \Carbon\Carbon::createFromTimestamp($stripeSubscription->trial_end) : null;
                            $subscription->ends_at = $stripeSubscription->cancel_at ? 
                                \Carbon\Carbon::createFromTimestamp($stripeSubscription->cancel_at) : null;
                            
                            $subscription->save();
                        } else {
                            // Update existing subscription using Cashier's subscription model
                            $stripeSubscription = Cashier::stripe()->subscriptions->retrieve($session->subscription);
                            $subscription->stripe_status = $stripeSubscription->status;
                            $subscription->stripe_price = $walletPlan->stripe_price_id;
                            $subscription->quantity = $stripeSubscription->items->data[0]->quantity ?? 1;
                            $subscription->trial_ends_at = $stripeSubscription->trial_end ? 
                                \Carbon\Carbon::createFromTimestamp($stripeSubscription->trial_end) : null;
                            $subscription->ends_at = $stripeSubscription->cancel_at ? 
                                \Carbon\Carbon::createFromTimestamp($stripeSubscription->cancel_at) : null;
                            $subscription->save();
                        }

                        Log::info('Subscription synced using Cashier', [
                            'user_id' => $user->id,
                            'subscription_id' => $subscription->id,
                            'stripe_subscription_id' => $session->subscription,
                        ]);
                    } catch (\Exception $e) {
                        Log::error('Failed to sync subscription using Cashier', [
                            'error' => $e->getMessage(),
                            'user_id' => $user->id,
                            'session_id' => $sessionId,
                            'stripe_subscription_id' => $session->subscription ?? null,
                        ]);
                        // Continue even if subscription sync fails - webhook will handle it
                    }
                }

                // Find or create a corresponding Plan record for the user's current_plan_id
                // This maintains compatibility with existing plan system
                $plan = Plan::where('stripe_price_id', $walletPlan->stripe_price_id)->first();

                if (!$plan) {
                    // Create a temporary plan record for compatibility
                    $plan = Plan::create([
                        'name' => $walletPlan->name,
                        'frequency' => $walletPlan->frequency,
                        'price' => $walletPlan->price,
                        'stripe_price_id' => $walletPlan->stripe_price_id,
                        'stripe_product_id' => $walletPlan->stripe_product_id,
                        'description' => $walletPlan->description,
                        'trial_days' => $walletPlan->trial_days,
                        'is_active' => true,
                    ]);
                }

                // Update user's current plan
                $user->current_plan_id = $plan->id;
                $user->save();

                Log::info('Wallet subscription successful', [
                    'user_id' => $user->id,
                    'wallet_plan_id' => $walletPlan->id,
                    'plan_id' => $plan->id ?? null,
                    'session_id' => $sessionId,
                    'stripe_subscription_id' => $session->subscription ?? null,
                    'kyc_fee_paid' => $kycFeeIncluded === 'true',
                    'kyc_fee_amount' => $kycFeeAmountFromSession,
                ]);

                // Render success page instead of redirecting
                $successMessage = 'Wallet subscription activated successfully! You can now access your digital wallet.';
                return Inertia::render('Plans/Success', [
                    'successMessage' => $successMessage,
                    'isWalletSubscription' => true,
                ]);
            }

            return redirect()->back()->withErrors([
                'message' => 'Payment was not completed. Please try again.',
            ]);

        } catch (\Exception $e) {
            Log::error('Wallet subscription success handler error', [
                'error' => $e->getMessage(),
                'session_id' => $request->query('session_id'),
            ]);

            return redirect()->back()->withErrors([
                'message' => 'An error occurred while processing your subscription. Please contact support.',
            ]);
        }
    }

    /**
     * Handle cancelled wallet subscription
     */
    public function walletSubscriptionCancel(Request $request)
    {
        return redirect()->back()->with('info', 'Subscription cancelled. You can subscribe anytime to access your wallet.');
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

            // IMPORTANT: Store subscription in database for recurring plans using Laravel Cashier's built-in methods
            // When using Checkout Sessions with mode='subscription', Stripe creates the subscription
            // Cashier will automatically sync it via webhooks, but we sync it here for immediate access
            if ($plan->frequency !== 'one-time' && $session->subscription) {
                try {
                    $stripe = Cashier::stripe();
                    
                    // Ensure user has stripe_id (required for Cashier)
                    if (!$user->stripe_id && $session->customer) {
                        $user->stripe_id = $session->customer;
                        $user->save();
                    }

                    // Use Cashier's subscription relationship to find or create
                    $subscription = $user->subscriptions()->firstOrNew([
                        'stripe_id' => $session->subscription,
                    ]);

                    // If subscription doesn't exist, retrieve from Stripe and sync using Cashier
                    if (!$subscription->exists) {
                        $stripeSubscription = Cashier::stripe()->subscriptions->retrieve($session->subscription);
                        
                        // Use Cashier's subscription model properties
                        $subscription->type = 'default';
                        $subscription->stripe_id = $stripeSubscription->id;
                        $subscription->stripe_status = $stripeSubscription->status;
                        $subscription->stripe_price = $plan->stripe_price_id;
                        $subscription->quantity = $stripeSubscription->items->data[0]->quantity ?? 1;
                        $subscription->trial_ends_at = $stripeSubscription->trial_end ? 
                            \Carbon\Carbon::createFromTimestamp($stripeSubscription->trial_end) : null;
                        $subscription->ends_at = $stripeSubscription->cancel_at ? 
                            \Carbon\Carbon::createFromTimestamp($stripeSubscription->cancel_at) : null;
                        
                        $subscription->save();
                    } else {
                        // Update existing subscription using Cashier's subscription model
                        $stripeSubscription = Cashier::stripe()->subscriptions->retrieve($session->subscription);
                        $subscription->stripe_status = $stripeSubscription->status;
                        $subscription->stripe_price = $plan->stripe_price_id;
                        $subscription->quantity = $stripeSubscription->items->data[0]->quantity ?? 1;
                        $subscription->trial_ends_at = $stripeSubscription->trial_end ? 
                            \Carbon\Carbon::createFromTimestamp($stripeSubscription->trial_end) : null;
                        $subscription->ends_at = $stripeSubscription->cancel_at ? 
                            \Carbon\Carbon::createFromTimestamp($stripeSubscription->cancel_at) : null;
                        $subscription->save();
                    }

                    Log::info('Plan subscription synced using Cashier', [
                        'user_id' => $user->id,
                        'subscription_id' => $subscription->id,
                        'stripe_subscription_id' => $session->subscription,
                        'plan_id' => $plan->id,
                    ]);
                } catch (\Exception $e) {
                    Log::error('Failed to sync plan subscription using Cashier', [
                        'error' => $e->getMessage(),
                        'user_id' => $user->id,
                        'session_id' => $sessionId,
                        'stripe_subscription_id' => $session->subscription ?? null,
                        'plan_id' => $plan->id,
                    ]);
                    // Continue even if subscription sync fails - webhook will handle it
                }
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
                    elseif (
                        ($fieldKey === 'ai_tokens_included' ||
                            $fieldKey === 'ai_tokens' ||
                            str_contains($fieldKey, 'token') ||
                            (str_contains($fieldLabel, 'token') || str_contains($fieldLabel, 'ai assistant'))) &&
                        $fieldType === 'number'
                    ) {
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
                    elseif (
                        ($fieldKey === 'credits' || str_contains($fieldLabel, 'credit')) &&
                        $fieldType === 'number' &&
                        !str_contains($fieldKey, 'token') &&
                        !str_contains($fieldLabel, 'token')
                    ) {
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

            // Render success page instead of redirecting
            return Inertia::render('Plans/Success', [
                'successMessage' => $successMessage,
            ]);
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

            // Cancel Stripe subscription using Laravel Cashier methods
            $subscriptionCancelled = false;

            // Use Cashier's subscription relationship to get all subscriptions
            $localSubscriptions = $user->subscriptions()->get();

            foreach ($localSubscriptions as $subscription) {
                if ($subscription->stripe_status === 'active' || $subscription->stripe_status === 'trialing') {
                    try {
                        // Use Cashier's cancelNow() method
                        $subscription->cancelNow();
                        $subscriptionCancelled = true;
                        Log::info('Subscription cancelled via Laravel Cashier', [
                            'subscription_id' => $subscription->stripe_id,
                            'user_id' => $user->id,
                        ]);
                    } catch (\Exception $e) {
                        Log::warning('Failed to cancel subscription via Cashier cancelNow', [
                            'subscription_id' => $subscription->stripe_id,
                            'error' => $e->getMessage(),
                        ]);

                        // Fallback: Use Cashier's Stripe client
                        try {
                            Cashier::stripe()->subscriptions->cancel($subscription->stripe_id);
                            $subscriptionCancelled = true;
                            Log::info('Subscription cancelled via Cashier Stripe client', [
                                'subscription_id' => $subscription->stripe_id,
                                'user_id' => $user->id,
                            ]);
                        } catch (\Exception $stripeError) {
                            Log::error('Failed to cancel subscription via Cashier', [
                                'subscription_id' => $subscription->stripe_id,
                                'error' => $stripeError->getMessage(),
                            ]);
                        }
                    }
                }
            }

            // If no subscription found in database, try to get it from Stripe using Cashier
            if (!$subscriptionCancelled) {
                try {
                    $stripeCustomerId = $user->stripe_id;

                    // If user doesn't have stripe_id, try to find customer by email using Cashier
                    if (!$stripeCustomerId) {
                        $customers = Cashier::stripe()->customers->all([
                            'email' => $user->email,
                            'limit' => 1,
                        ]);

                        if (count($customers->data) > 0) {
                            $stripeCustomerId = $customers->data[0]->id;
                            // Store stripe_id for future use
                            $user->update(['stripe_id' => $stripeCustomerId]);
                        }
                    }

                    // Get all active subscriptions for this customer using Cashier
                    if ($stripeCustomerId) {
                        $stripeSubscriptions = Cashier::stripe()->subscriptions->all([
                            'customer' => $stripeCustomerId,
                            'status' => 'all',
                            'limit' => 100,
                        ]);

                        foreach ($stripeSubscriptions->data as $stripeSubscription) {
                            // Only cancel active or trialing subscriptions
                            if ($stripeSubscription->status === 'active' || $stripeSubscription->status === 'trialing') {
                                try {
                                    // Cancel immediately using Cashier's Stripe client
                                    Cashier::stripe()->subscriptions->cancel($stripeSubscription->id);
                                    $subscriptionCancelled = true;

                                    Log::info('Subscription cancelled via Cashier from Stripe', [
                                        'subscription_id' => $stripeSubscription->id,
                                        'customer_id' => $stripeCustomerId,
                                        'user_id' => $user->id,
                                        'status' => $stripeSubscription->status,
                                    ]);
                                } catch (\Exception $e) {
                                    Log::error('Failed to cancel subscription via Cashier', [
                                        'subscription_id' => $stripeSubscription->id,
                                        'error' => $e->getMessage(),
                                    ]);
                                }
                            }
                        }
                    }
                } catch (\Exception $e) {
                    Log::error('Error retrieving subscriptions via Cashier', [
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
