<?php

namespace App\Http\Controllers;

use App\Models\CareAlliance;
use App\Models\Donation;
use App\Models\Organization;
use App\Models\User;
use App\Services\CareAlliancePublicPageService;
use App\Services\ImpactScoreService;
use App\Services\SeoService;
use App\Services\StripeConfigService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Collection;
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
     * Recipient nonprofit is allowed to receive donations if they have a platform plan and/or an active Stripe subscription.
     * Aligns with ProductController: Cashier subscriptions often exist without users.current_plan_id being set.
     */
    private function recipientUserHasActiveSubscription(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        if ($user->current_plan_id !== null) {
            return true;
        }

        if (method_exists($user, 'subscribed')) {
            try {
                if ($user->subscribed()) {
                    return true;
                }
            } catch (\Exception $e) {
                Log::warning('Failed to check Cashier subscription for donation recipient', [
                    'user_id' => $user->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        // Named subscriptions (not only `default`) — any active/trialing row in Cashier
        try {
            if ($user->subscriptions()->whereIn('stripe_status', ['active', 'trialing'])->exists()) {
                return true;
            }
        } catch (\Exception $e) {
            Log::warning('Failed to list subscriptions for donation recipient', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
        }

        return false;
    }

    /**
     * Care Alliance donations often credit a member/hub org whose owner is not the paying platform user.
     * Allow when the alliance creator (subscriber) has an active plan, if they are the real billing account.
     */
    private function donationRecipientMatchesAlliance(CareAlliance $alliance, Organization $recipientOrg): bool
    {
        if (strtolower(trim((string) $alliance->status)) !== 'active') {
            return false;
        }
        $expected = app(CareAlliancePublicPageService::class)->donationRecipientOrganizationForAlliance($alliance);

        return $expected !== null && (int) $expected->id === (int) $recipientOrg->id;
    }

    private function careAllianceCandidateIdsForRecipientOrganization(Organization $recipientOrg): Collection
    {
        $ids = CareAlliance::query()
            ->where('hub_organization_id', $recipientOrg->id)
            ->whereRaw('LOWER(TRIM(status)) = ?', ['active'])
            ->pluck('id');

        if (Schema::hasTable('care_alliance_memberships')) {
            $ids = $ids->merge(
                DB::table('care_alliance_memberships')
                    ->where('organization_id', $recipientOrg->id)
                    ->where('status', 'active')
                    ->pluck('care_alliance_id')
            );
        }

        return $ids->unique()->values();
    }

    private function careAllianceCreatorSubscriptionCoversDonation(int $careAllianceId, Organization $recipientOrg): bool
    {
        $alliance = CareAlliance::query()->find($careAllianceId);
        if (! $alliance || ! $this->donationRecipientMatchesAlliance($alliance, $recipientOrg)) {
            return false;
        }
        if (! $alliance->creator_user_id) {
            return false;
        }
        $creator = User::query()->find($alliance->creator_user_id);

        return $creator && $this->recipientUserHasActiveSubscription($creator);
    }

    /**
     * When care_alliance_id is missing, find active alliances whose resolved donation recipient is this org
     * and whose creator has a subscription (hub org and/or active member org).
     */
    private function anyAllianceCreatorPlanCoversRecipientOrganization(Organization $recipientOrg): bool
    {
        foreach ($this->careAllianceCandidateIdsForRecipientOrganization($recipientOrg)->all() as $aid) {
            $alliance = CareAlliance::query()->find($aid);
            if (! $alliance || ! $this->donationRecipientMatchesAlliance($alliance, $recipientOrg)) {
                continue;
            }
            if ($alliance->creator_user_id) {
                $creator = User::query()->find($alliance->creator_user_id);
                if ($creator && $this->recipientUserHasActiveSubscription($creator)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * First matching alliance for this recipient (stable order) — used for Stripe checkout line item label.
     */
    private function firstCareAllianceMatchingRecipientOrganization(Organization $recipientOrg): ?CareAlliance
    {
        foreach ($this->careAllianceCandidateIdsForRecipientOrganization($recipientOrg)->sort()->values()->all() as $aid) {
            $alliance = CareAlliance::query()->find($aid);
            if ($alliance && $this->donationRecipientMatchesAlliance($alliance, $recipientOrg)) {
                return $alliance;
            }
        }

        return null;
    }

    private function resolveCareAllianceForCheckoutDisplay(Request $request, Organization $recipientOrg): ?CareAlliance
    {
        if ($request->input('recipient_kind') !== 'care_alliance') {
            return null;
        }

        $careAllianceId = $request->input('care_alliance_id');
        if ($careAllianceId !== null && $careAllianceId !== '') {
            $alliance = CareAlliance::query()->find((int) $careAllianceId);
            if ($alliance && $this->donationRecipientMatchesAlliance($alliance, $recipientOrg)) {
                return $alliance;
            }
        }

        return $this->firstCareAllianceMatchingRecipientOrganization($recipientOrg);
    }

    /**
     * Display a listing of the donations.
     */
    // In your DonationController.php
    public function index(Request $request)
    {
        $user = Auth::user();

        $search = $request->input('search');
        $hasSearch = $search !== null && $search !== '';

        // Approved nonprofits available for donations
        $orgQuery = Organization::where('registration_status', 'approved');
        if ($hasSearch) {
            $orgQuery->where(function ($q) use ($search) {
                $q->where('name', 'like', '%'.$search.'%')
                    ->orWhere('description', 'like', '%'.$search.'%')
                    ->orWhere('mission', 'like', '%'.$search.'%')
                    ->orWhere('city', 'like', '%'.$search.'%')
                    ->orWhere('state', 'like', '%'.$search.'%');
            });
        }

        $orgRows = $orgQuery->orderBy('name')->get()->map(function (Organization $org) {
            return [
                'id' => 'org-'.$org->id,
                'kind' => 'organization',
                'organization_id' => $org->id,
                'name' => $org->name,
                'description' => $org->description ?? $org->mission ?? 'No description available.',
                'image' => $org->registered_user_image ? asset('storage/'.$org->registered_user_image) : null,
                'raised' => (float) ($org->balance ?? 0),
                'goal' => 0,
                'supporters' => $org->donations()->distinct('user_id')->count('user_id'),
            ];
        });

        // Care Alliances: show when an approved recipient org exists (hub or active member).
        // Listing matches organizations (no subscription filter); store() enforces subscription at checkout.
        $allianceQuery = CareAlliance::query()
            ->whereRaw('LOWER(TRIM(status)) = ?', ['active'])
            ->with('creator:id,image');
        if ($hasSearch) {
            $allianceQuery->where(function ($q) use ($search) {
                $q->where('name', 'like', '%'.$search.'%')
                    ->orWhere('description', 'like', '%'.$search.'%');
            });
        }

        $publicPage = app(CareAlliancePublicPageService::class);
        $allianceRows = $allianceQuery->orderBy('name')->get()->map(function (CareAlliance $alliance) use ($publicPage) {
            $recipient = $publicPage->donationRecipientOrganizationForAlliance($alliance);
            if ($recipient === null) {
                return null;
            }

            $image = null;
            if ($alliance->creator?->image) {
                $img = (string) $alliance->creator->image;
                $image = str_starts_with($img, 'http') ? $img : asset('storage/'.ltrim($img, '/'));
            }

            return [
                'id' => 'ca-'.$alliance->id,
                'kind' => 'care_alliance',
                'organization_id' => $recipient->id,
                'name' => $alliance->name,
                'description' => $alliance->description
                    ? strip_tags((string) $alliance->description)
                    : 'Care Alliance — shared fundraising for member nonprofits.',
                'image' => $image,
                'raised' => (float) ($recipient->balance ?? 0),
                'goal' => 0,
                'supporters' => $recipient->donations()->distinct('user_id')->count('user_id'),
                'alliance_slug' => $alliance->slug,
                'care_alliance_id' => $alliance->id,
            ];
        })->filter()->values();

        $organizations = $orgRows->concat($allianceRows)->sortBy('name', SORT_NATURAL)->values();

        // Year-to-date giving and top 3 organizations for logged-in users
        $thisYearDonated = 0.0;
        $givingGoal = 1000; // default goal for progress bar
        $topOrganizations = [];
        if ($user) {
            $thisYearDonated = (float) Donation::where('user_id', $user->id)
                ->whereIn('status', ['completed', 'active'])
                ->whereYear('donation_date', now()->year)
                ->sum('amount');
            $topOrganizations = Donation::where('user_id', $user->id)
                ->whereIn('status', ['completed', 'active'])
                ->selectRaw('organization_id, SUM(amount) as total')
                ->groupBy('organization_id')
                ->orderByDesc('total')
                ->take(3)
                ->with('organization:id,name')
                ->get()
                ->map(function ($row) {
                    return [
                        'name' => $row->organization?->name ?? 'Unknown',
                        'total' => (float) $row->total,
                    ];
                })
                ->values()
                ->all();
        }

        return Inertia::render('frontend/donate', [
            'seo' => SeoService::forPage('donate'),
            'organizations' => $organizations->values(),
            'message' => 'Please log in to view your donations.',
            'user' => $user ? [
                'name' => $user->name,
                'email' => $user->email,
            ] : null,
            'searchQuery' => $request->input('search', ''),
            'thisYearDonated' => $thisYearDonated,
            'givingGoal' => $givingGoal,
            'topOrganizations' => $topOrganizations,
        ]);
    }

    /**
     * Store a non-cash (in-kind) donation request.
     * Admin reviews and approves before it becomes official.
     */
    public function storeNonCash(Request $request)
    {
        $validated = $request->validate([
            'non_cash_type' => 'required|in:goods,services,stocks_crypto,vehicle,other',
            'item_name' => 'required|string|max:500',
            'estimated_fair_market_value' => 'required|numeric|min:0',
            'condition' => 'nullable|string|max:50',
            'organization_id' => 'required|exists:organizations,id',
            'upload_photos' => 'boolean',
        ]);

        $user = $request->user();
        $organization = Organization::findOrFail($validated['organization_id']);

        if ($organization->registration_status !== 'approved') {
            return redirect()->back()->withErrors([
                'organization_id' => 'The selected organization is not approved for donations.',
            ]);
        }

        // TODO: Create NonCashDonationRequest model and store when ready.
        // For now we acknowledge the request and redirect with success.
        Log::info('Non-cash donation request received', [
            'user_id' => $user->id,
            'organization_id' => $organization->id,
            'type' => $validated['non_cash_type'],
            'item_name' => $validated['item_name'],
            'estimated_value' => $validated['estimated_fair_market_value'],
        ]);

        return redirect()->back()->with('success', 'Your non-cash donation request has been submitted. We\'ll be in touch shortly.');
    }

    /**
     * Show the donation form
     */
    public function create(Request $request, Organization $organization)
    {
        return Inertia::render('Donations/Create', [
            'organization' => $organization,
            'stripeKey' => \App\Services\StripeConfigService::getPublishableKey() ?? config('cashier.key'),
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

        $requireSubscription = filter_var(env('REQUIRE_SUBSCRIPTION_FOR_DONATIONS', true), FILTER_VALIDATE_BOOLEAN);
        if ($requireSubscription) {
            $organization->loadMissing('user');
            $orgUser = $organization->user;
            $orgRecipientHasPlan = $orgUser && $this->recipientUserHasActiveSubscription($orgUser);

            $recipientKind = $request->input('recipient_kind', 'organization');
            $careAllianceId = $request->input('care_alliance_id');

            if ($recipientKind === 'care_alliance') {
                $creatorCovers = false;
                if ($careAllianceId !== null && $careAllianceId !== '') {
                    $creatorCovers = $this->careAllianceCreatorSubscriptionCoversDonation((int) $careAllianceId, $organization);
                }
                if (! $creatorCovers) {
                    $creatorCovers = $this->anyAllianceCreatorPlanCoversRecipientOrganization($organization);
                }

                if (! $orgRecipientHasPlan && ! $creatorCovers) {
                    return redirect()->back()->withErrors([
                        'subscription' => 'The nonprofit receiving donations for this Care Alliance does not have an active subscription. Donations are not available at this time.',
                    ])->with('subscription_required', true);
                }
            } elseif ($orgUser && ! $orgRecipientHasPlan) {
                return redirect()->back()->withErrors([
                    'subscription' => 'This organization does not have an active subscription. Donations are not available at this time.',
                ])->with('subscription_required', true);
            }
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
        // Supporters and organization users can donate; block admin
        if ($user->hasRole('admin')) {
            return redirect()->back()->with('warning', 'Please use a supporter or organization account to make a donation.');
        }

        // Prevent organization from donating to itself
        $donorOrg = $user->organization ?? null;
        if ($donorOrg && (int) $donorOrg->id === (int) $organization->id) {
            return redirect()->back()->with('warning', 'You cannot donate to your own organization.');
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
            $allianceForCheckout = $this->resolveCareAllianceForCheckoutDisplay($request, $organization);

            // Stripe line item: alliance donations show only the Care Alliance name (no member list or payout copy).
            $checkoutLineTitle = $allianceForCheckout !== null
                ? sprintf('Donation to %s', $allianceForCheckout->name)
                : "Donation to {$organizationName}";

            $metadata = [
                'donation_id' => (string) $donation->id,
                'organization_id' => (string) $organization->id,
            ];
            if ($allianceForCheckout !== null) {
                $metadata['care_alliance_id'] = (string) $allianceForCheckout->id;
                $metadata['care_alliance_name'] = mb_substr((string) $allianceForCheckout->name, 0, 500);
            }

            $checkoutOptions = [
                'success_url' => route('donations.success') . '?session_id={CHECKOUT_SESSION_ID}',
                'cancel_url' => route('donations.cancel'),
                'metadata' => $metadata,
                'payment_method_types' => ['card'],
            ];

            if ($validated['frequency'] !== 'one-time') {
                $checkoutOptions['subscription_data'] = [
                    'description' => mb_substr($checkoutLineTitle, 0, 500),
                ];
            }

            if ($validated['frequency'] === 'one-time') {
                $checkout = $user->checkoutCharge(
                    $amountInCents,
                    mb_substr($checkoutLineTitle, 0, 250),
                    1,
                    $checkoutOptions,
                    [],
                    []
                );
            } else {
                // Recurring donation (product name comes from Stripe product; description on subscription)
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
