<?php

namespace App\Http\Controllers;

use App\Models\CareAlliance;
use App\Models\Donation;
use App\Models\Organization;
use App\Models\User;
use App\Services\CareAllianceGeneralDonationDistributionService;
use App\Services\CareAlliancePublicPageService;
use App\Services\DonationLedgerSyncService;
use App\Services\DonationProcessingFeeEstimator;
use App\Services\ImpactScoreService;
use App\Services\SeoService;
use App\Services\StripeConfigService;
use App\Services\StripeEnvironmentSyncService;
use App\Services\StripeProcessingFeeEstimator;
use App\Support\StripeCustomerChargeAmount;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
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
        if ($request->input('recipient_kind') === 'care_alliance') {
            $careAllianceId = $request->input('care_alliance_id');
            if ($careAllianceId !== null && $careAllianceId !== '') {
                $alliance = CareAlliance::query()->find((int) $careAllianceId);
                if ($alliance && $this->donationRecipientMatchesAlliance($alliance, $recipientOrg)) {
                    return $alliance;
                }
            }

            return $this->firstCareAllianceMatchingRecipientOrganization($recipientOrg);
        }

        // Org profile / favorites / embedded donate flows omit recipient_kind but use the same organization_id
        // as the alliance's public donation recipient — attach alliance so financial settings apply.
        if ($request->missing('recipient_kind')) {
            return $this->firstCareAllianceMatchingRecipientOrganization($recipientOrg);
        }

        return null;
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
        $orgQuery = Organization::where('registration_status', 'approved')->excludingCareAllianceHubs();
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

        $feePreview = null;
        if ($request->filled('fee_preview_amount')) {
            $validator = Validator::make($request->only(['fee_preview_amount', 'fee_preview_donor_covers', 'fee_preview_rail']), [
                'fee_preview_amount' => 'required|numeric|min:0.01',
                'fee_preview_donor_covers' => 'sometimes|boolean',
                'fee_preview_rail' => 'nullable|in:card,bank',
            ]);
            if (! $validator->fails()) {
                $base = round((float) $validator->validated()['fee_preview_amount'], 2);
                $rail = $request->input('fee_preview_rail', 'card');
                $rail = in_array($rail, ['card', 'bank'], true) ? $rail : 'card';
                $feePreview = $this->feePreviewPayload($base, $request->boolean('fee_preview_donor_covers'), $rail);
            }
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
            'feePreview' => $feePreview,
        ]);
    }

    /**
     * @return array{mode: string, rail: string, base_gift_usd: float, checkout_total_usd: float, processing_fee_estimate: float, estimated_net_to_org_usd: float}
     */
    private function feePreviewPayload(float $base, bool $donorCovers, string $rail = 'card'): array
    {
        $rail = in_array($rail, ['card', 'bank'], true) ? $rail : 'card';

        if ($donorCovers) {
            if ($rail === 'bank') {
                $checkoutTotal = DonationProcessingFeeEstimator::grossUpAchChargeUsdForNetGiftUsd($base);
                $feeAddon = DonationProcessingFeeEstimator::feeAddonWhenDonorCoversAchUsd($base);
            } else {
                $checkoutTotal = DonationProcessingFeeEstimator::grossUpCardChargeUsdForNetGiftUsd($base);
                $feeAddon = DonationProcessingFeeEstimator::feeAddonWhenDonorCoversUsd($base);
            }

            return [
                'mode' => 'donor_covers',
                'rail' => $rail,
                'base_gift_usd' => $base,
                'checkout_total_usd' => round($checkoutTotal, 2),
                'processing_fee_estimate' => round($feeAddon, 2),
                'estimated_net_to_org_usd' => $base,
            ];
        }

        if ($rail === 'bank') {
            $fee = DonationProcessingFeeEstimator::estimateAchFeeOnChargeUsd($base);
            $net = DonationProcessingFeeEstimator::estimateNetAfterAchFeeWhenOrgAbsorbsUsd($base);
        } else {
            $fee = DonationProcessingFeeEstimator::estimateCardFeeOnChargeUsd($base);
            $net = DonationProcessingFeeEstimator::estimateNetAfterCardFeeWhenOrgAbsorbsUsd($base);
        }

        return [
            'mode' => 'org_covers',
            'rail' => $rail,
            'base_gift_usd' => $base,
            'checkout_total_usd' => $base,
            'processing_fee_estimate' => round($fee, 2),
            'estimated_net_to_org_usd' => $net,
        ];
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
        if (! $organization) {
            $excelData = \App\Models\ExcelData::find($organizationId);
            if ($excelData) {
                // Find Organization by EIN
                $organization = Organization::where('ein', $excelData->ein)
                    ->where('registration_status', 'approved')
                    ->first();
            }
        }

        // Validate organization exists and is approved
        if (! $organization || $organization->registration_status !== 'approved') {
            return redirect()->back()->withErrors([
                'organization_id' => 'The selected organization is invalid or not approved for donations.',
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
                $creatorCovers = $this->anyAllianceCreatorPlanCoversRecipientOrganization($organization);
                if (! $creatorCovers) {
                    return redirect()->back()->withErrors([
                        'subscription' => 'This organization does not have an active subscription. Donations are not available at this time.',
                    ])->with('subscription_required', true);
                }
            }
        }

        $validated = $request->validate([
            'amount' => 'required|numeric|min:1',
            'frequency' => 'required|in:one-time,weekly,monthly',
            'message' => 'nullable|string|max:500',
            'payment_method' => 'nullable|string|in:stripe,believe_points',
            'donor_covers_processing_fees' => 'sometimes|boolean',
            'donation_fee_rail' => 'nullable|in:card,bank',
        ]);

        $user = $request->user();
        $paymentMethod = $validated['payment_method'] ?? 'stripe';
        $baseGiftUsd = (float) $validated['amount'];
        $donorCoversFees = $paymentMethod === 'stripe' && $request->boolean('donor_covers_processing_fees');
        $feeRail = $validated['donation_fee_rail'] ?? 'card';
        $feeRail = in_array($feeRail, ['card', 'bank'], true) ? $feeRail : 'card';

        $checkoutTotalUsd = $baseGiftUsd;
        $processingFeeEstimate = null;
        if ($paymentMethod === 'stripe') {
            if ($donorCoversFees) {
                if ($feeRail === 'bank') {
                    $checkoutTotalUsd = DonationProcessingFeeEstimator::grossUpAchChargeUsdForNetGiftUsd($baseGiftUsd);
                    $processingFeeEstimate = DonationProcessingFeeEstimator::feeAddonWhenDonorCoversAchUsd($baseGiftUsd);
                } else {
                    $checkoutTotalUsd = DonationProcessingFeeEstimator::grossUpCardChargeUsdForNetGiftUsd($baseGiftUsd);
                    $processingFeeEstimate = DonationProcessingFeeEstimator::feeAddonWhenDonorCoversUsd($baseGiftUsd);
                }
            } else {
                $checkoutTotalUsd = $baseGiftUsd;
                $processingFeeEstimate = $feeRail === 'bank'
                    ? DonationProcessingFeeEstimator::estimateAchFeeOnChargeUsd($baseGiftUsd)
                    : DonationProcessingFeeEstimator::estimateCardFeeOnChargeUsd($baseGiftUsd);
            }
        }

        if ($paymentMethod === 'stripe' && ! $donorCoversFees && StripeProcessingFeeEstimator::customerPaysProcessingFeeEnabled()) {
            $rail = $feeRail === 'bank' ? 'us_bank_account' : 'card';
            $amountInCents = StripeCustomerChargeAmount::chargeCentsFromNetUsd($baseGiftUsd, $rail);
        } else {
            $amountInCents = (int) round($checkoutTotalUsd * 100);
        }
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

        // Validate Believe Points payment
        if ($paymentMethod === 'believe_points') {
            // Believe Points only available for one-time donations
            if ($validated['frequency'] !== 'one-time') {
                return redirect()->back()->withErrors([
                    'payment_method' => 'Believe Points can only be used for one-time donations. Please select "One-time" frequency or use Stripe for recurring donations.',
                ]);
            }

            $pointsRequired = $validated['amount']; // 1$ = 1 believe point
            $user->refresh(); // Get latest balance

            if ($user->believe_points < $pointsRequired) {
                return redirect()->back()->withErrors([
                    'payment_method' => "Insufficient Believe Points. You need {$pointsRequired} points but only have {$user->believe_points} points.",
                ]);
            }
        }

        $allianceForCheckout = $this->resolveCareAllianceForCheckoutDisplay($request, $organization);
        if ($allianceForCheckout && ! $allianceForCheckout->financial_settings_completed_at) {
            return redirect()->back()->withErrors([
                'message' => 'This alliance must complete Financial Settings under Settings → Profile before receiving donations.',
            ]);
        }

        // Create donation record (amount = intended gift to recipient; checkout may be higher if donor covers card fees)
        $donation = Donation::create([
            'user_id' => $user->id,
            'organization_id' => $organization->id,
            'care_alliance_id' => $allianceForCheckout?->id,
            'amount' => $baseGiftUsd,
            'donor_covers_processing_fees' => $paymentMethod === 'stripe' && $donorCoversFees,
            'processing_fee_estimate' => $processingFeeEstimate,
            'checkout_total' => $paymentMethod === 'stripe' ? round($checkoutTotalUsd, 2) : round($baseGiftUsd, 2),
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
                if (! $user->deductBelievePoints($pointsRequired)) {
                    \Illuminate\Support\Facades\DB::rollBack();
                    $donation->update(['status' => 'failed']);

                    return redirect()->back()->withErrors([
                        'payment_method' => 'Failed to deduct Believe Points. Please try again.',
                    ]);
                }

                // Complete donation with Believe Points
                $donation->update([
                    'status' => 'completed',
                    'transaction_id' => 'believe_points_donation_'.$donation->id,
                ]);

                $this->applyDonationToBalances($donation);

                // Award impact points for completed donation
                $this->impactScoreService->awardDonationPoints($donation);

                \Illuminate\Support\Facades\DB::commit();

                return redirect(route('donations.success').'?donation_id='.$donation->id)
                    ->with('success', 'Donation completed successfully using Believe Points!');
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\DB::rollBack();
                $donation->update(['status' => 'failed']);
                Log::error('Believe Points donation failed: '.$e->getMessage());

                return redirect()->back()->withErrors([
                    'payment_method' => 'Failed to process donation: '.$e->getMessage(),
                ]);
            }
        }

        // Handle Stripe payment
        try {
            if (! StripeEnvironmentSyncService::ensureUserStripeCustomer($user)) {
                $donation->update(['status' => 'failed']);
                Log::error('Donation Stripe checkout failed', [
                    'user_id' => $user->id,
                    'error' => 'Could not prepare Stripe customer for current account',
                ]);

                return redirect()->back()->withErrors([
                    'message' => 'Payment setup failed. Please try again in a moment.',
                ]);
            }
            $user->refresh();

            // Stripe line item: alliance donations show only the Care Alliance name (no member list or payout copy).
            $checkoutLineTitle = $allianceForCheckout !== null
                ? sprintf('Donation to %s', $allianceForCheckout->name)
                : "Donation to {$organizationName}";

            $metadata = [
                'donation_id' => (string) $donation->id,
                'organization_id' => (string) $organization->id,
                'base_gift_amount' => (string) $baseGiftUsd,
                'donor_covers_processing_fees' => $donorCoversFees ? '1' : '0',
                'fee_rail' => $feeRail,
            ];
            if ($allianceForCheckout !== null) {
                $metadata['care_alliance_id'] = (string) $allianceForCheckout->id;
                $metadata['care_alliance_name'] = mb_substr((string) $allianceForCheckout->name, 0, 500);
            }

            $checkoutOptions = [
                'success_url' => route('donations.success').'?session_id={CHECKOUT_SESSION_ID}',
                'cancel_url' => route('donations.cancel'),
                'metadata' => $metadata,
                'payment_method_types' => $feeRail === 'bank' ? ['us_bank_account'] : ['card'],
                'billing_address_collection' => 'auto',
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
            Log::error('Donation Stripe checkout failed', ['user_id' => $user->id, 'error' => $e->getMessage()]);

            return redirect()->back()->withErrors([
                'message' => 'Payment processing failed: '.$e->getMessage(),
            ]);
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
        if ($donationId && ! $sessionId) {
            $donation = Donation::with(['organization', 'user', 'careAlliance:id,name,slug'])->find($donationId);

            if ($donation && $donation->payment_method === 'believe_points' && $donation->status === 'completed') {
                return Inertia::render('frontend/organization/donation/success', [
                    'donation' => $donation,
                    'paymentMethod' => 'believe_points',
                ]);
            } elseif ($donation && $donation->payment_method === 'believe_points' && $donation->status !== 'completed') {
                return redirect()->route('donate')->withErrors([
                    'message' => 'Donation is still processing. Please wait a moment.',
                ]);
            }
        }

        // Handle Stripe payment success
        if (! $sessionId) {
            return redirect()->route('donate')->withErrors([
                'message' => 'Invalid donation session',
            ]);
        }
        try {
            $session = Cashier::stripe()->checkout->sessions->retrieve($sessionId);
            $donation = Donation::with(['organization', 'user', 'careAlliance:id,name,slug'])->findOrFail($session->metadata->donation_id);

            $user = $donation->user;

            // Check payment status from Stripe session
            if ($session->payment_status === 'paid') {
                if ($session->payment_intent) {
                    // One-time: only settle wallets once (success URL can be reloaded).
                    $alreadySettled = $donation->status === 'completed'
                        && (string) $donation->transaction_id === (string) $session->payment_intent;
                    if (! $alreadySettled) {
                        DB::transaction(function () use ($donation, $session) {
                            $donation->update([
                                'transaction_id' => $session->payment_intent,
                                'payment_method' => $this->stripeCheckoutPaymentMethodLabel($session),
                                'status' => 'completed',
                                'donation_date' => now(),
                            ]);
                            $this->applyDonationToBalances($donation->fresh());
                        });

                        $this->impactScoreService->awardDonationPoints($donation->fresh());
                    }
                } elseif ($session->subscription) {
                    // Recurring payment - store subscription using Laravel Cashier
                    try {
                        // Ensure user has stripe_id (required for Cashier)
                        if (! $user->stripe_id && $session->customer) {
                            $user->stripe_id = $session->customer;
                            $user->save();
                        }

                        // Use Cashier's subscription relationship to find or create
                        $subscription = $user->subscriptions()->firstOrNew([
                            'stripe_id' => $session->subscription,
                        ]);

                        // If subscription doesn't exist, retrieve from Stripe and sync using Cashier
                        if (! $subscription->exists) {
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

                    // Recurring: first checkout only — same guard as one-time (page refresh).
                    $alreadySettled = in_array($donation->status, ['active', 'completed'], true)
                        && (string) $donation->transaction_id === (string) $session->subscription;
                    if (! $alreadySettled) {
                        DB::transaction(function () use ($donation, $session) {
                            $donation->update([
                                'transaction_id' => $session->subscription,
                                'payment_method' => $this->stripeCheckoutPaymentMethodLabel($session),
                                'status' => 'active',
                                'donation_date' => now(),
                            ]);
                            $this->applyDonationToBalances($donation->fresh());
                        });
                    }

                    // Status is "active" for recurring checkout — awardDonationPoints only runs for "completed".
                    if (! $alreadySettled) {
                        $this->impactScoreService->awardDonationPoints($donation->fresh());
                    }
                } else {
                    // Payment is paid but no payment_intent or subscription found
                    $alreadySettled = $donation->status === 'completed'
                        && (string) $donation->transaction_id === (string) $session->id;
                    if (! $alreadySettled) {
                        DB::transaction(function () use ($donation, $session) {
                            $donation->update([
                                'transaction_id' => $session->id,
                                'payment_method' => $this->stripeCheckoutPaymentMethodLabel($session),
                                'status' => 'completed',
                                'donation_date' => now(),
                            ]);
                            $this->applyDonationToBalances($donation->fresh());
                        });

                        $this->impactScoreService->awardDonationPoints($donation->fresh());
                    }
                }
            } else {
                // Payment not completed yet
                Log::warning('Donation success page accessed but payment not completed', [
                    'donation_id' => $donation->id,
                    'session_id' => $sessionId,
                    'payment_status' => $session->payment_status,
                ]);
            }

            // Refresh donation to get updated status (re-load display relations)
            $donation->refresh();
            $donation->load(['organization', 'user', 'careAlliance:id,name,slug']);

            return Inertia::render('frontend/organization/donation/success', [
                'donation' => $donation,
                'paymentMethod' => 'stripe',
            ]);
        } catch (\Exception $e) {
            return Inertia::render('frontend/organization/donation/success')->withErrors([
                'message' => 'Error verifying payment: '.$e->getMessage(),
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
                Log::error('Error updating canceled donation: '.$e->getMessage());
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
            'weekly' => 'week',
            'monthly' => 'month',
        ];

        if (! array_key_exists($frequency, $intervalMap)) {
            throw new \InvalidArgumentException("Invalid recurring frequency: {$frequency}");
        }

        $interval = $intervalMap[$frequency];

        // Get donation product ID dynamically based on current environment
        $productId = StripeConfigService::getDonationProductId();

        if (! $productId) {
            throw new \Exception('Failed to get or create donation product. Please check your Stripe configuration.');
        }

        // Create dynamic price with Stripe
        $price = Cashier::stripe()->prices->create([
            'unit_amount' => $amountInCents,
            'currency' => 'usd',
            'recurring' => ['interval' => $interval],
            'product' => $productId,
        ]);

        return $price->id;
    }

    /**
     * Resolve Stripe payment method type (card, us_bank_account, …) from a completed Checkout Session.
     */
    private function stripeCheckoutPaymentMethodLabel(object $session): string
    {
        try {
            if (! empty($session->payment_intent)) {
                $piId = is_string($session->payment_intent) ? $session->payment_intent : $session->payment_intent->id;
                $pi = Cashier::stripe()->paymentIntents->retrieve($piId, ['expand' => ['payment_method']]);
                if ($pi->payment_method && is_object($pi->payment_method) && isset($pi->payment_method->type)) {
                    return (string) $pi->payment_method->type;
                }
            }
            if (! empty($session->subscription)) {
                $subId = is_string($session->subscription) ? $session->subscription : $session->subscription->id;
                $sub = Cashier::stripe()->subscriptions->retrieve($subId, ['expand' => ['default_payment_method']]);
                if ($sub->default_payment_method && is_object($sub->default_payment_method) && isset($sub->default_payment_method->type)) {
                    return (string) $sub->default_payment_method->type;
                }
            }
        } catch (\Throwable $e) {
            Log::warning('stripeCheckoutPaymentMethodLabel failed', ['error' => $e->getMessage()]);
        }

        if (is_array($session->payment_method_types ?? null) && $session->payment_method_types !== []) {
            return (string) $session->payment_method_types[0];
        }

        return 'card';
    }

    /**
     * Normal (main /donate) Care Alliance gifts: split by alliance financial rules when configured.
     * Otherwise credit the recipient organization only (legacy / non-alliance).
     */
    private function applyDonationToBalances(Donation $donation): void
    {
        $donation->loadMissing('organization.user');
        if ($donation->care_alliance_id) {
            $alliance = CareAlliance::query()->find($donation->care_alliance_id);
            if ($alliance && $alliance->financial_settings_completed_at) {
                $amountCents = (int) round((float) $donation->amount * 100);
                $svc = app(CareAllianceGeneralDonationDistributionService::class);
                $dist = $svc->computeDistribution($alliance, $amountCents);
                if (CareAllianceGeneralDonationDistributionService::distributionIsScheduled($alliance->distribution_frequency)) {
                    $svc->accumulatePendingDistribution($alliance, $dist['org_shares'], $dist['fee_cents']);
                } else {
                    $svc->distributeCompletedDonation($donation, $alliance, $dist['org_shares'], $dist['fee_cents']);
                }

                return;
            }
        }
        if ($donation->organization && $donation->organization->user) {
            DonationLedgerSyncService::recordRecipientDepositIfMissing($donation, true);

            Log::info('Donation added to organization user balance', [
                'donation_id' => $donation->id,
                'organization_id' => $donation->organization->id,
                'amount' => $donation->amount,
            ]);
        }
    }

    /**
     * Display donations for the organization
     */
    public function organizationIndex(Request $request)
    {
        $user = $request->user();
        $organization = Organization::where('user_id', $user->id)->first();

        if (! $organization) {
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
