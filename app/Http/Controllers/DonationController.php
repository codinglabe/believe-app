<?php

namespace App\Http\Controllers;

use App\Models\Donation;
use App\Models\Organization;
use App\Services\ImpactScoreService;
use App\Services\StripeConfigService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Laravel\Cashier\Cashier;

class DonationController extends Controller
{
    protected $impactScoreService;

    public function __construct(ImpactScoreService $impactScoreService)
    {
        $this->impactScoreService = $impactScoreService;
    }
    /**
     * Display a listing of the donations.
     */
    // In your DonationController.php
    public function index(Request $request)
    {
        $user = Auth::user();

        // Show all approved organizations available for donations
        // Organizations must be approved to receive donations
        $query = Organization::where('registration_status', 'approved');

        // Apply search filter if a search query is present
        if ($request->has('search') && $request->input('search') !== '') {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%')
                    ->orWhere('description', 'like', '%' . $search . '%')
                    ->orWhere('mission', 'like', '%' . $search . '%')
                    ->orWhere('city', 'like', '%' . $search . '%')
                    ->orWhere('state', 'like', '%' . $search . '%');
            });
        }

        // Order by name for better UX
        $query->orderBy('name', 'asc');

        $organizations = $query->get()->map(function ($org) {
            return [
                'id' => $org->id,
                'name' => $org->name,
                'description' => $org->description ?? $org->mission ?? 'No description available.',
                'image' => $org->registered_user_image ? asset('storage/' . $org->registered_user_image) : null,
                'raised' => (float) ($org->balance ?? 0),
                'goal' => 0, // You can add a goal field if needed
                'supporters' => $org->donations()->distinct('user_id')->count('user_id'),
            ];
        });

        return Inertia::render('frontend/donate', [
            'organizations' => $organizations,
            'message' => 'Please log in to view your donations.',
            'user' => $user ? [
                'name' => $user->name,
                'email' => $user->email,
            ] : null,
            'searchQuery' => $request->input('search', ''), // Pass back the current search query
        ]);
    }

    /**
     * Show the donation form
     */
    public function create(Request $request, Organization $organization)
    {
        return Inertia::render('Donations/Create', [
            'organization' => $organization,
            'stripeKey' => config('cashier.key'),
            'user' => $request->user() ? [
                'name' => $request->user()->name,
                'email' => $request->user()->email,
            ] : null,
        ]);
    }

    /**
     * Process the donation
     */
    public function store(Request $request)
    {
        // First, try to find organization by ID
        $organizationId = $request->input('organization_id');
        $organization = Organization::find($organizationId);

        // If not found, it might be an ExcelData ID - try to find by EIN
        if (!$organization) {
            $excelData = \App\Models\ExcelData::find($organizationId);
            if ($excelData) {
                // Find Organization by EIN
                $organization = Organization::where('ein', $excelData->ein)
                    ->where('registration_status', 'approved')
                    ->first();
            }
        }

        // Validate organization exists and is approved
        if (!$organization || $organization->registration_status !== 'approved') {
            return redirect()->back()->withErrors([
                'organization_id' => 'The selected organization is invalid or not approved for donations.'
            ]);
        }

        // Check if organization has active subscription
        if ($organization->user && $organization->user->current_plan_id === null) {
            return redirect()->back()->withErrors([
                'subscription' => 'This organization does not have an active subscription. Donations are not available at this time.'
            ])->with('subscription_required', true);
        }

        $validated = $request->validate([
            'amount' => 'required|numeric|min:1',
            'frequency' => 'required|in:one-time,weekly,monthly',
            'message' => 'nullable|string|max:500',
            'payment_method' => 'nullable|string|in:stripe,believe_points',
        ]);

        $user = $request->user();
        $amountInCents = (int) ($validated['amount'] * 100);
        $organizationName = $organization->name;
        if ($user->hasRole(['organization', 'admin'])) {
            return redirect()->back()->with('warning', 'Please log in with a supporter account to make a donation.');
        }

        $paymentMethod = $validated['payment_method'] ?? 'stripe';

        // Validate Believe Points payment
        if ($paymentMethod === 'believe_points') {
            // Believe Points only available for one-time donations
            if ($validated['frequency'] !== 'one-time') {
                return redirect()->back()->withErrors([
                    'payment_method' => 'Believe Points can only be used for one-time donations. Please select "One-time" frequency or use Stripe for recurring donations.'
                ]);
            }

            $pointsRequired = $validated['amount']; // 1$ = 1 believe point
            $user->refresh(); // Get latest balance

            if ($user->believe_points < $pointsRequired) {
                return redirect()->back()->withErrors([
                    'payment_method' => "Insufficient Believe Points. You need {$pointsRequired} points but only have {$user->believe_points} points."
                ]);
            }
        }

        // Create donation record
        $donation = Donation::create([
            'user_id' => $user->id,
            'organization_id' => $organization->id,
            'amount' => $validated['amount'],
            'frequency' => $validated['frequency'],
            'status' => 'pending',
            'payment_method' => $paymentMethod,
            'transaction_id' => rand(100000, 999999), // Temporary transaction ID
            'donation_date' => now(),
            'message' => $validated['message'] ?? null,
        ]);

        // Handle Believe Points payment
        if ($paymentMethod === 'believe_points') {
            try {
                \Illuminate\Support\Facades\DB::beginTransaction();

                $pointsRequired = $validated['amount'];

                // Deduct points
                if (!$user->deductBelievePoints($pointsRequired)) {
                    \Illuminate\Support\Facades\DB::rollBack();
                    $donation->update(['status' => 'failed']);
                    return redirect()->back()->withErrors([
                        'payment_method' => 'Failed to deduct Believe Points. Please try again.'
                    ]);
                }

                // Complete donation with Believe Points
                $donation->update([
                    'status' => 'completed',
                    'transaction_id' => 'believe_points_donation_' . $donation->id,
                ]);

                // Add donation amount to organization's user balance
                if ($donation->organization && $donation->organization->user) {
                    $donation->organization->user->increment('balance', $donation->amount);
                    Log::info('Donation added to organization user balance (Believe Points)', [
                        'donation_id' => $donation->id,
                        'organization_id' => $donation->organization->id,
                        'user_id' => $donation->organization->user->id,
                        'amount' => $donation->amount,
                        'new_balance' => $donation->organization->user->fresh()->balance,
                    ]);
                }

                // Award impact points for completed donation
                $this->impactScoreService->awardDonationPoints($donation);

                \Illuminate\Support\Facades\DB::commit();

                return redirect(route('donations.success') . '?donation_id=' . $donation->id)
                    ->with('success', 'Donation completed successfully using Believe Points!');
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\DB::rollBack();
                $donation->update(['status' => 'failed']);
                Log::error('Believe Points donation failed: ' . $e->getMessage());
                return redirect()->back()->withErrors([
                    'payment_method' => 'Failed to process donation: ' . $e->getMessage()
                ]);
            }
        }

        // Handle Stripe payment
        try {
            $checkoutOptions = [
                'success_url' => route('donations.success') . '?session_id={CHECKOUT_SESSION_ID}',
                'cancel_url' => route('donations.cancel'),
                'metadata' => [
                    'donation_id' => $donation->id,
                    'organization_id' => $organization->id,
                ],
                'payment_method_types' => ['card'],
            ];

            if ($validated['frequency'] === 'one-time') {
                // One-time payment
                $checkout = $user->checkoutCharge(
                    $amountInCents,
                    "Donation to {$organizationName}",
                    1,
                    $checkoutOptions
                );
            } else {
                // Recurring donation
                $priceId = $this->createDynamicStripePrice($amountInCents, $validated['frequency']);

                $checkout = $user->newSubscription('donation', $priceId)
                    ->allowPromotionCodes()
                    ->checkout($checkoutOptions);
            }

            return Inertia::location($checkout->url);
        } catch (\Exception $e) {
            $donation->update(['status' => 'failed']);

            return response()->json([
                'error' => 'Payment processing failed: ' . $e->getMessage()
            ], 500);
        }
    }


    /**
     * Handle successful payment
     */
    public function success(Request $request)
    {
        $sessionId = $request->get('session_id');
        $donationId = $request->get('donation_id');

        // Handle Believe Points donation success (no session_id needed)
        if ($donationId && !$sessionId) {
            $donation = Donation::with(['organization', 'user'])->find($donationId);

            if ($donation && $donation->payment_method === 'believe_points' && $donation->status === 'completed') {
                return Inertia::render('frontend/organization/donation/success', [
                    'donation' => $donation,
                    'paymentMethod' => 'believe_points',
                ]);
            } elseif ($donation && $donation->payment_method === 'believe_points' && $donation->status !== 'completed') {
                return redirect()->route('donate')->withErrors([
                    'message' => 'Donation is still processing. Please wait a moment.'
                ]);
            }
        }

        // Handle Stripe payment success
        if (!$sessionId) {
            return redirect()->route('donate')->withErrors([
                'message' => 'Invalid donation session'
            ]);
        }
        try {
            $session = Cashier::stripe()->checkout->sessions->retrieve($sessionId);
            $donation = Donation::with(['organization', 'user'])->findOrFail($session->metadata->donation_id);

            $user = $donation->user;
            
            // Check payment status from Stripe session
            if ($session->payment_status === 'paid') {
                if ($session->payment_intent) {
                    // One-time payment
                    $donation->update([
                        'transaction_id' => $session->payment_intent,
                        'payment_method' => $session->payment_method_types[0] ?? 'card',
                        'status' => 'completed',
                        'donation_date' => now(),
                    ]);

                    // Add donation amount to organization's user balance
                    if ($donation->organization && $donation->organization->user) {
                        $donation->organization->user->increment('balance', $donation->amount);
                        Log::info('Donation added to organization user balance', [
                            'donation_id' => $donation->id,
                            'organization_id' => $donation->organization->id,
                            'user_id' => $donation->organization->user->id,
                            'amount' => $donation->amount,
                            'new_balance' => $donation->organization->user->fresh()->balance,
                        ]);
                    }

                    // Award impact points for completed donation
                    $this->impactScoreService->awardDonationPoints($donation);
                } elseif ($session->subscription) {
                    // Recurring payment - store subscription using Laravel Cashier
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
                            
                            // Get the price ID from the subscription
                            $priceId = $stripeSubscription->items->data[0]->price->id ?? null;
                            
                            // Use Cashier's subscription model properties
                            $subscription->type = 'donation';
                            $subscription->stripe_id = $stripeSubscription->id;
                            $subscription->stripe_status = $stripeSubscription->status;
                            $subscription->stripe_price = $priceId;
                            $subscription->quantity = $stripeSubscription->items->data[0]->quantity ?? 1;
                            $subscription->trial_ends_at = $stripeSubscription->trial_end ? 
                                \Carbon\Carbon::createFromTimestamp($stripeSubscription->trial_end) : null;
                            $subscription->ends_at = $stripeSubscription->cancel_at ? 
                                \Carbon\Carbon::createFromTimestamp($stripeSubscription->cancel_at) : null;
                            
                            $subscription->save();

                            Log::info('Donation subscription stored using Cashier', [
                                'user_id' => $user->id,
                                'subscription_id' => $subscription->id,
                                'stripe_subscription_id' => $session->subscription,
                                'donation_id' => $donation->id,
                            ]);
                        } else {
                            // Update existing subscription using Cashier's subscription model
                            $stripeSubscription = Cashier::stripe()->subscriptions->retrieve($session->subscription);
                            $priceId = $stripeSubscription->items->data[0]->price->id ?? null;
                            $subscription->stripe_status = $stripeSubscription->status;
                            $subscription->stripe_price = $priceId;
                            $subscription->quantity = $stripeSubscription->items->data[0]->quantity ?? 1;
                            $subscription->trial_ends_at = $stripeSubscription->trial_end ? 
                                \Carbon\Carbon::createFromTimestamp($stripeSubscription->trial_end) : null;
                            $subscription->ends_at = $stripeSubscription->cancel_at ? 
                                \Carbon\Carbon::createFromTimestamp($stripeSubscription->cancel_at) : null;
                            $subscription->save();

                            Log::info('Donation subscription updated using Cashier', [
                                'user_id' => $user->id,
                                'subscription_id' => $subscription->id,
                                'stripe_subscription_id' => $session->subscription,
                                'donation_id' => $donation->id,
                            ]);
                        }
                    } catch (\Exception $e) {
                        Log::error('Failed to store donation subscription using Cashier', [
                            'error' => $e->getMessage(),
                            'user_id' => $user->id,
                            'session_id' => $sessionId,
                            'stripe_subscription_id' => $session->subscription ?? null,
                            'donation_id' => $donation->id,
                        ]);
                        // Continue even if subscription storage fails - webhook will handle it
                    }

                    // Recurring payment
                    $donation->update([
                        'transaction_id' => $session->subscription,
                        'payment_method' => 'card',
                        'status' => 'active',
                        'donation_date' => now(),
                    ]);

                    // Add donation amount to organization's user balance for recurring donations
                    if ($donation->organization && $donation->organization->user) {
                        $donation->organization->user->increment('balance', $donation->amount);
                        Log::info('Recurring donation added to organization user balance', [
                            'donation_id' => $donation->id,
                            'organization_id' => $donation->organization->id,
                            'user_id' => $donation->organization->user->id,
                            'amount' => $donation->amount,
                            'new_balance' => $donation->organization->user->fresh()->balance,
                        ]);
                    }

                    // Award impact points for active recurring donation
                    $this->impactScoreService->awardDonationPoints($donation);
                } else {
                    // Payment is paid but no payment_intent or subscription found
                    // Still mark as completed if payment_status is paid
                    $donation->update([
                        'transaction_id' => $session->id,
                        'payment_method' => $session->payment_method_types[0] ?? 'card',
                        'status' => 'completed',
                        'donation_date' => now(),
                    ]);

                    // Add donation amount to organization's user balance
                    if ($donation->organization && $donation->organization->user) {
                        $donation->organization->user->increment('balance', $donation->amount);
                        Log::info('Donation added to organization user balance (fallback)', [
                            'donation_id' => $donation->id,
                            'organization_id' => $donation->organization->id,
                            'user_id' => $donation->organization->user->id,
                            'amount' => $donation->amount,
                            'new_balance' => $donation->organization->user->fresh()->balance,
                        ]);
                    }

                    // Award impact points
                    $this->impactScoreService->awardDonationPoints($donation);
                }
            } else {
                // Payment not completed yet
                Log::warning('Donation success page accessed but payment not completed', [
                    'donation_id' => $donation->id,
                    'session_id' => $sessionId,
                    'payment_status' => $session->payment_status,
                ]);
            }

            // Refresh donation to get updated status
            $donation->refresh();

            return Inertia::render('frontend/organization/donation/success', [
                'donation' => $donation,
                'paymentMethod' => 'stripe',
            ]);
        } catch (\Exception $e) {
            return Inertia::render('frontend/organization/donation/success')->withErrors([
                'message' => 'Error verifying payment: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Handle canceled payment
     */
    public function cancel(Request $request)
    {
        $sessionId = $request->get('session_id');

        if ($sessionId) {
            try {
                $session = Cashier::stripe()->checkout->sessions->retrieve($sessionId);
                if ($session->metadata->donation_id) {
                    Donation::where('id', $session->metadata->donation_id)
                        ->update(['status' => 'canceled']);
                }
            } catch (\Exception $e) {
                // Log error but continue to cancel page
                Log::error('Error updating canceled donation: ' . $e->getMessage());
            }
        }

        return Inertia::render('frontend/organization/donation/cancel');
    }

    /**
     * Create dynamic Stripe price for recurring donations
     */
    protected function createDynamicStripePrice(int $amountInCents, string $frequency): string
    {
        // Map your app frequencies to Stripe-recognized intervals
        $intervalMap = [
            'weekly'  => 'week',
            'monthly' => 'month',
        ];

        if (!array_key_exists($frequency, $intervalMap)) {
            throw new \InvalidArgumentException("Invalid recurring frequency: {$frequency}");
        }

        $interval = $intervalMap[$frequency];

        // Get donation product ID dynamically based on current environment
        $productId = StripeConfigService::getDonationProductId();

        if (!$productId) {
            throw new \Exception("Failed to get or create donation product. Please check your Stripe configuration.");
        }

        // Create dynamic price with Stripe
        $price = Cashier::stripe()->prices->create([
            'unit_amount' => $amountInCents,
            'currency'    => 'usd',
            'recurring'   => ['interval' => $interval],
            'product'     => $productId,
        ]);

        return $price->id;
    }

    /**
     * Display donations for the organization
     */
    public function organizationIndex(Request $request)
    {
        $user = $request->user();
        $organization = Organization::where('user_id', $user->id)->first();

        if (!$organization) {
            abort(404, 'Organization not found');
        }

        $donations = Donation::where('organization_id', $organization->id)
            ->with(['user:id,name,email'])
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return Inertia::render('Donations/Index', [
            'donations' => $donations,
            'organization' => $organization,
        ]);
    }
}
