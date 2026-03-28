<?php

namespace App\Http\Controllers\CareAlliance;

use App\Http\Controllers\Controller;
use App\Models\CareAlliance;
use App\Models\CareAllianceCampaign;
use App\Models\CareAllianceDonation;
use App\Models\Organization;
use App\Services\CareAllianceSplitService;
use App\Services\SeoService;
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

    public function donatePage(string $allianceSlug, int $campaignId)
    {
        $alliance = CareAlliance::where('slug', $allianceSlug)->firstOrFail();
        $campaign = CareAllianceCampaign::where('care_alliance_id', $alliance->id)
            ->where('id', $campaignId)
            ->where('status', 'active')
            ->with(['splits.organization:id,name', 'careAlliance:id,name,slug'])
            ->firstOrFail();

        return Inertia::render('care-alliance/Donate', [
            'seo' => SeoService::forPage('care_alliance_donate'),
            'alliance' => [
                'id' => $alliance->id,
                'name' => $alliance->name,
                'slug' => $alliance->slug,
            ],
            'campaign' => [
                'id' => $campaign->id,
                'name' => $campaign->name,
                'description' => $campaign->description,
            ],
        ]);
    }

    public function preview(Request $request, string $allianceSlug, int $campaignId)
    {
        $alliance = CareAlliance::where('slug', $allianceSlug)->firstOrFail();
        $campaign = CareAllianceCampaign::where('care_alliance_id', $alliance->id)
            ->where('id', $campaignId)
            ->where('status', 'active')
            ->with(['splits.organization:id,name'])
            ->firstOrFail();

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

    public function checkout(Request $request, string $allianceSlug, int $campaignId)
    {
        $user = $request->user();
        if ($user->hasRole('admin')) {
            return response()->json([
                'success' => false,
                'message' => 'Please use a supporter or organization account to donate.',
            ], 403);
        }

        $alliance = CareAlliance::where('slug', $allianceSlug)->firstOrFail();
        $campaign = CareAllianceCampaign::where('care_alliance_id', $alliance->id)
            ->where('id', $campaignId)
            ->where('status', 'active')
            ->with(['splits.organization:id,name'])
            ->firstOrFail();

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
            'status' => 'pending',
            'split_snapshot' => $lines,
        ]);

        $amountDollars = $validated['amount_cents'] / 100;

        try {
            $checkoutOptions = [
                'success_url' => route('care-alliance.donations.success').'?session_id={CHECKOUT_SESSION_ID}',
                'cancel_url' => route('care-alliance.campaigns.donate', [$allianceSlug, $campaignId]),
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
            $donation->update(['status' => 'failed']);
            Log::error('Care Alliance Stripe checkout failed', ['e' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Payment could not be started: '.$e->getMessage(),
            ], 500);
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

            if ($session->payment_status === 'paid' && $donation->status === 'pending') {
                DB::transaction(function () use ($donation, $session) {
                    $donation->update([
                        'status' => 'completed',
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
