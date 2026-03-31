<?php

namespace App\Http\Controllers\CareAlliance;

use App\Http\Controllers\Controller;
use App\Models\CareAlliance;
use App\Models\CareAllianceCampaign;
use App\Models\CareAllianceDonation;
use App\Models\Organization;
use App\Services\CareAllianceSplitService;
use App\Services\SeoService;
use App\Services\StripeEnvironmentSyncService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Laravel\Cashier\Cashier;

class CareAllianceDonationController extends Controller
{
    public function __construct(
        private CareAllianceSplitService $splitService
    ) {}

    public function donatePage(Request $request, string $allianceSlug, CareAllianceCampaign $campaign)
    {
        $alliance = CareAlliance::where('slug', $allianceSlug)->firstOrFail();
        if ((int) $campaign->care_alliance_id !== (int) $alliance->id || $campaign->status !== 'active') {
            abort(404);
        }

        $campaign->load([
            'splits' => fn ($q) => $q->orderBy('id')->with(['organization:id,name']),
            'careAlliance:id,name,slug',
        ]);

        $user = $request->user();
        $checkoutDisabledAsAllianceOwner = $user !== null
            && (int) $user->id === (int) $alliance->creator_user_id;

        $hasAmountQuery = $request->has('amount_cents');
        $amountCents = $hasAmountQuery
            ? max(0, (int) $request->query('amount_cents'))
            : 2500;

        $lines = [];
        $splitError = null;

        if ($amountCents >= 100) {
            try {
                $lines = $this->splitService->snapshotForAmount($campaign, $amountCents);
            } catch (\Throwable $e) {
                $splitError = $e->getMessage();
                $lines = [];
            }
        }

        return Inertia::render('care-alliance/Donate', [
            'seo' => SeoService::forPage('care_alliance_donate'),
            'alliance' => [
                'id' => $alliance->id,
                'name' => $alliance->name,
                'slug' => $alliance->slug,
            ],
            'campaign' => [
                'id' => $campaign->id,
                'slug' => $campaign->slug,
                'name' => $campaign->name,
                'description' => $campaign->description,
            ],
            'donation_amount_cents' => $amountCents,
            'lines' => $lines,
            'split_error' => $splitError,
            'campaign_has_splits' => $campaign->splits->isNotEmpty(),
            'checkout_disabled_as_alliance_owner' => $checkoutDisabledAsAllianceOwner,
        ]);
    }

    public function preview(Request $request, string $allianceSlug, CareAllianceCampaign $campaign)
    {
        $alliance = CareAlliance::where('slug', $allianceSlug)->firstOrFail();
        if ((int) $campaign->care_alliance_id !== (int) $alliance->id || $campaign->status !== 'active') {
            abort(404);
        }

        $campaign->load(['splits.organization:id,name']);

        $validated = $request->validate([
            'amount_cents' => 'required|integer|min:100',
        ]);

        try {
            $lines = $this->splitService->snapshotForAmount($campaign, $validated['amount_cents']);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'success' => true,
            'lines' => $lines,
            'amount_cents' => $validated['amount_cents'],
        ]);
    }

    public function checkout(Request $request, string $allianceSlug, CareAllianceCampaign $campaign)
    {
        $user = $request->user();
        if ($user->hasRole('admin')) {
            return response()->json([
                'success' => false,
                'message' => 'Please use a supporter or organization account to donate.',
            ], 403);
        }

        $alliance = CareAlliance::where('slug', $allianceSlug)->firstOrFail();
        if ((int) $campaign->care_alliance_id !== (int) $alliance->id || $campaign->status !== 'active') {
            abort(404);
        }

        if ((int) $user->id === (int) $alliance->creator_user_id) {
            return response()->json([
                'success' => false,
                'message' => 'Alliance operators cannot donate through their own campaign link.',
            ], 403);
        }

        $campaign->load(['splits.organization:id,name']);

        $validated = $request->validate([
            'amount_cents' => 'required|integer|min:100',
        ]);

        try {
            $lines = $this->splitService->snapshotForAmount($campaign, $validated['amount_cents']);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }

        $donation = CareAllianceDonation::create([
            'care_alliance_campaign_id' => $campaign->id,
            'donor_user_id' => $user->id,
            'amount_cents' => $validated['amount_cents'],
            'currency' => 'USD',
            'status' => CareAllianceDonation::STATUS_PENDING,
            'split_snapshot' => $lines,
        ]);

        $amountDollars = $validated['amount_cents'] / 100;

        try {
            if (! StripeEnvironmentSyncService::ensureUserStripeCustomer($user)) {
                $donation->update(['status' => CareAllianceDonation::STATUS_FAILED]);
                Log::error('Care Alliance Stripe checkout failed', [
                    'error' => 'Could not prepare Stripe customer for current account',
                ]);

                return redirect()->back()->withErrors([
                    'message' => 'Payment setup failed. Please try again in a moment.',
                ]);
            }
            $user->refresh();

            $checkoutOptions = [
                'success_url' => route('care-alliance.donations.success').'?session_id={CHECKOUT_SESSION_ID}',
                'cancel_url' => route('care-alliance.campaigns.donate', [
                    'allianceSlug' => $allianceSlug,
                    'campaign' => $campaign->slug,
                ]),
                'metadata' => [
                    'care_alliance_donation_id' => (string) $donation->id,
                ],
                'payment_method_types' => ['card'],
            ];

            $checkout = $user->checkoutCharge(
                $validated['amount_cents'],
                'Donation: '.$campaign->name,
                1,
                $checkoutOptions
            );

            return Inertia::location($checkout->url);
        } catch (\Throwable $e) {
            $donation->update(['status' => CareAllianceDonation::STATUS_FAILED]);
            Log::error('Care Alliance Stripe checkout failed', ['e' => $e->getMessage()]);

            return redirect()->back()->withErrors([
                'message' => 'Payment could not be started: '.$e->getMessage(),
            ]);
        }
    }

    public function success(Request $request)
    {
        $sessionId = $request->query('session_id');
        if (! $sessionId) {
            return redirect('/')->withErrors(['message' => 'Invalid session']);
        }

        try {
            $session = Cashier::stripe()->checkout->sessions->retrieve($sessionId);
            $donationId = $session->metadata->care_alliance_donation_id ?? null;
            if (! $donationId) {
                return redirect('/')->withErrors(['message' => 'Invalid donation metadata']);
            }

            $donation = CareAllianceDonation::with(['campaign.careAlliance'])->findOrFail($donationId);

            if ($session->payment_status === 'paid' && $donation->status === CareAllianceDonation::STATUS_PENDING) {
                DB::transaction(function () use ($donation, $session) {
                    $donation->update([
                        'status' => CareAllianceDonation::STATUS_COMPLETED,
                        'payment_reference' => $session->payment_intent ?? $session->id,
                    ]);

                    $snapshot = $donation->split_snapshot ?? [];
                    foreach ($snapshot as $line) {
                        $cents = (int) ($line['cents'] ?? 0);
                        if ($cents < 1) {
                            continue;
                        }
                        $dollars = round($cents / 100, 2);

                        if (($line['type'] ?? '') === 'alliance') {
                            $alliance = $donation->campaign?->careAlliance;
                            if ($alliance) {
                                $alliance->increment('balance_cents', $cents);
                            }
                        } elseif (($line['type'] ?? '') === 'organization' && ! empty($line['organization_id'])) {
                            $org = Organization::find($line['organization_id']);
                            if ($org && $org->user) {
                                $org->user->increment('balance', $dollars);
                                $payRef = (string) ($donation->payment_reference ?? '');
                                $ledgerTxId = ($payRef !== '' && (str_starts_with($payRef, 'pi_')
                                    || str_starts_with($payRef, 'cs_')
                                    || str_starts_with($payRef, 'ch_'))) ? $payRef : null;
                                $txPayload = [
                                    'type' => 'deposit',
                                    'amount' => $dollars,
                                    'fee' => 0,
                                    'payment_method' => 'care_alliance_campaign_donation',
                                    'related_type' => CareAllianceDonation::class,
                                    'related_id' => $donation->id,
                                    'meta' => array_filter([
                                        'care_alliance_donation_id' => $donation->id,
                                        'organization_id' => $org->id,
                                        'source' => 'care_alliance_campaign_split',
                                        'campaign_name' => $donation->campaign?->name,
                                        'care_alliance_name' => $donation->campaign?->careAlliance?->name,
                                        'stripe_payment_intent' => str_starts_with($payRef, 'pi_') ? $payRef : null,
                                    ]),
                                ];
                                if ($ledgerTxId !== null) {
                                    $txPayload['transaction_id'] = $ledgerTxId;
                                }
                                $org->user->recordTransaction($txPayload);
                            }
                        }
                    }
                });
            }

            return Inertia::render('care-alliance/DonationSuccess', [
                'donation' => [
                    'amount_cents' => $donation->amount_cents,
                    'campaign_name' => $donation->campaign?->name,
                    'lines' => $donation->split_snapshot,
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('Care Alliance donation success handling failed', ['e' => $e->getMessage()]);

            return redirect('/')->withErrors(['message' => 'Could not confirm payment.']);
        }
    }
}
