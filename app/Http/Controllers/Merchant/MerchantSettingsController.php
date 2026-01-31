<?php

namespace App\Http\Controllers\Merchant;

use App\Http\Controllers\Controller;
use App\Models\Merchant;
use App\Models\MerchantSubscriptionPlan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Cashier\Cashier;

class MerchantSettingsController extends Controller
{
    /**
     * Display the settings page with billing data
     */
    public function index(Request $request)
    {
        $merchant = Auth::guard('merchant')->user();

        // Get billing data
        $billingData = $this->getBillingData($merchant);

        return Inertia::render('merchant/Settings', [
            'billingData' => $billingData,
        ]);
    }

    /**
     * Get billing data (subscriptions and invoices)
     */
    private function getBillingData($merchant)
    {
        // Get current subscription - only active, trialing, or past_due (not canceled)
        $currentSubscription = $merchant->subscriptions()
            ->whereIn('stripe_status', ['active', 'trialing', 'past_due'])
            ->orderBy('created_at', 'desc')
            ->first();

        $subscriptionData = null;
        if ($currentSubscription) {
            // Always refresh subscription from Stripe to get latest status (dynamic)
            $isCanceled = false;
            try {
                if ($currentSubscription->stripe_id) {
                    $stripe = Cashier::stripe();
                    $stripeSubscription = $stripe->subscriptions->retrieve($currentSubscription->stripe_id);
                    
                    // Update local subscription with latest data from Stripe
                    $currentSubscription->stripe_status = $stripeSubscription->status;
                    $currentSubscription->ends_at = $stripeSubscription->cancel_at ? 
                        \Carbon\Carbon::createFromTimestamp($stripeSubscription->cancel_at) : null;
                    $currentSubscription->trial_ends_at = $stripeSubscription->trial_end ? 
                        \Carbon\Carbon::createFromTimestamp($stripeSubscription->trial_end) : null;
                    $currentSubscription->save();
                    
                    // Check if subscription is canceled
                    // Status is 'canceled' OR cancel_at is set (meaning it's scheduled to cancel)
                    // If cancel_at is set, don't show as current plan even if still active
                    $isCanceled = $stripeSubscription->status === 'canceled' || 
                                 ($stripeSubscription->cancel_at !== null);
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
            }

            // Only create subscription data if subscription is still active (not canceled)
            if (!$isCanceled) {
                $plan = MerchantSubscriptionPlan::where('stripe_price_id', $currentSubscription->stripe_price)->first();
                
                $subscriptionData = [
                    'id' => $currentSubscription->id,
                    'stripe_id' => $currentSubscription->stripe_id,
                    'stripe_status' => $currentSubscription->stripe_status,
                    'stripe_price' => $currentSubscription->stripe_price,
                    'quantity' => $currentSubscription->quantity,
                    'trial_ends_at' => $currentSubscription->trial_ends_at?->toIso8601String(),
                    'ends_at' => $currentSubscription->ends_at?->toIso8601String(),
                    'created_at' => $currentSubscription->created_at->toIso8601String(),
                    'plan' => $plan ? [
                        'id' => $plan->id,
                        'name' => $plan->name,
                        'price' => (float) $plan->price,
                        'frequency' => $plan->frequency,
                    ] : null,
                ];
            }
        }

        // Get invoices from Stripe
        $invoices = [];
        if ($merchant->stripe_id) {
            try {
                $stripe = Cashier::stripe();
                $stripeInvoices = $stripe->invoices->all([
                    'customer' => $merchant->stripe_id,
                    'limit' => 50,
                ]);

                foreach ($stripeInvoices->data as $invoice) {
                    // Check if the subscription related to this invoice is canceled
                    $subscriptionCanceled = false;
                    if ($invoice->subscription) {
                        try {
                            $stripeSubscription = $stripe->subscriptions->retrieve($invoice->subscription);
                            $subscriptionCanceled = $stripeSubscription->status === 'canceled' || 
                                                   ($stripeSubscription->cancel_at !== null);
                        } catch (\Exception $e) {
                            // If we can't retrieve subscription, check local database
                            $localSubscription = $merchant->subscriptions()
                                ->where('stripe_id', $invoice->subscription)
                                ->first();
                            if ($localSubscription) {
                                $subscriptionCanceled = $localSubscription->stripe_status === 'canceled' || 
                                                       ($localSubscription->ends_at !== null);
                            }
                        }
                    }

                    $invoices[] = [
                        'id' => $invoice->id,
                        'number' => $invoice->number,
                        'amount_paid' => $invoice->amount_paid / 100,
                        'amount_due' => $invoice->amount_due / 100,
                        'currency' => strtoupper($invoice->currency),
                        'status' => $invoice->status,
                        'paid' => $invoice->paid,
                        'subscription_canceled' => $subscriptionCanceled,
                        'created' => date('Y-m-d H:i:s', $invoice->created),
                        'period_start' => $invoice->period_start ? date('Y-m-d', $invoice->period_start) : null,
                        'period_end' => $invoice->period_end ? date('Y-m-d', $invoice->period_end) : null,
                        'hosted_invoice_url' => $invoice->hosted_invoice_url,
                        'invoice_pdf' => $invoice->invoice_pdf,
                        'description' => $invoice->description ?? ($invoice->lines->data[0]->description ?? 'Subscription'),
                    ];
                }
            } catch (\Exception $e) {
                \Log::error('Failed to fetch invoices for merchant', [
                    'merchant_id' => $merchant->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return [
            'subscription' => $subscriptionData,
            'invoices' => $invoices,
        ];
    }

    /**
     * Update the merchant's profile
     */
    public function updateProfile(Request $request)
    {
        $merchant = Auth::guard('merchant')->user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'lowercase',
                'email',
                'max:255',
                Rule::unique('merchants')->ignore($merchant->id),
            ],
            'phone' => ['nullable', 'string', 'max:255'],
        ]);

        $merchant->update([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
        ]);

        return back()->with('flash', ['success' => 'Profile updated successfully.']);
    }

    /**
     * Update the merchant's business information
     */
    public function updateBusiness(Request $request)
    {
        $merchant = Auth::guard('merchant')->user();

        $validated = $request->validate([
            'business_name' => ['required', 'string', 'max:255'],
            'business_description' => ['nullable', 'string'],
            'website' => ['nullable', 'url', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:255'],
            'state' => ['nullable', 'string', 'max:255'],
            'zip_code' => ['nullable', 'string', 'max:20'],
            'country' => ['nullable', 'string', 'max:255'],
        ]);

        $merchant->update($validated);

        return back()->with('flash', ['success' => 'Business information updated successfully.']);
    }
}

