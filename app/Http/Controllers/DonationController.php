<?php

namespace App\Http\Controllers;

use App\Models\Donation;
use App\Models\Organization;
use App\Services\ImpactScoreService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Laravel\Cashier\Cashier;
use Stripe\Stripe;
use Stripe\Exception\ApiErrorException;

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

        $query = Organization::when($user, function ($q) use ($user) {
            return $q->whereHas('followers', function ($query) use ($user) {
                $query->where('user_id', $user->id);
            });
        })->whereHas('user', function ($query) {
            $query->where('role', 'organization')
                ->where('login_status', 1);
        });

        // Apply search filter if a search query is present
        if ($request->has('search') && $request->input('search') !== '') {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%')
                    ->orWhere('description', 'like', '%' . $search . '%');
            });
        }

        $organizations = $query->get(); // Get filtered organizations

        return Inertia::render('frontend/donate', [
            'organizations' => $organizations, // This will now be the filtered list
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
        $validated = $request->validate([
            'organization_id' => 'required|exists:organizations,id',
            'amount' => 'required|numeric|min:1',
            'frequency' => 'required|in:one-time,weekly,monthly',
            'message' => 'nullable|string|max:500',
        ]);

        $user = $request->user();
        $amountInCents = (int) ($validated['amount'] * 100);
        $organizationName = Organization::find($validated['organization_id'])->name;
        if ($user->hasRole(['organization', 'admin'])) {
            return redirect()->back()->with('warning', 'Please log in with a supporter account to make a donation.');
        }
        // Create donation record
        $donation = Donation::create([
            'user_id' => $user->id,
            'organization_id' => $validated['organization_id'],
            'amount' => $validated['amount'],
            'frequency' => $validated['frequency'],
            'status' => 'pending',
            'payment_method' => 'stripe',
            'transaction_id' => rand(100000, 999999), // Temporary transaction ID
            'donation_date' => now(),
            'message' => $validated['message'] ?? null,
        ]);

        try {
            $checkoutOptions = [
                'success_url' => route('donations.success') . '?session_id={CHECKOUT_SESSION_ID}',
                'cancel_url' => route('donations.cancel'),
                'metadata' => [
                    'donation_id' => $donation->id,
                    'organization_id' => $validated['organization_id'],
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


        if (!$sessionId) {
            return redirect()->route('donations.index')->withErrors([
                'message' => 'Invalid donation session'
            ]);
        }
        try {
            $session = Cashier::stripe()->checkout->sessions->retrieve($sessionId);
            $donation = Donation::with(['organization', 'user'])->findOrFail($session->metadata->donation_id);
            if ($session->payment_intent) {
                // One-time payment
                $donation->update([
                    'transaction_id' => $session->payment_intent,
                    'payment_method' => $session->payment_method_types[0] ?? 'card',
                    'status' => 'completed',
                    'donation_date' => now(),
                ]);
                
                // Award impact points for completed donation
                $this->impactScoreService->awardDonationPoints($donation);
            } elseif ($session->subscription) {
                // Recurring payment
                $donation->update([
                    'transaction_id' => $session->subscription,
                    'payment_method' => 'card',
                    'status' => 'active',
                    'donation_date' => now(),
                ]);
                
                // Award impact points for active recurring donation
                $this->impactScoreService->awardDonationPoints($donation);
            }

            return Inertia::render('frontend/organization/donation/success', [
                'donation' => $donation,
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

        // Your product ID
        $productId = config('stripe.donation_product_id', 'prod_SgdExZQM4U18aQ');

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
