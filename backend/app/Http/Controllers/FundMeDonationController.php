<?php

namespace App\Http\Controllers;

use App\Models\FundMeCampaign;
use App\Models\FundMeDonation;
use App\Services\StripeConfigService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Stripe\Checkout\Session as StripeCheckoutSession;
use Stripe\Stripe;

class FundMeDonationController extends Controller
{
    /**
     * Create donation (pending) and Stripe Checkout Session; return checkout URL.
     * Only logged-in users. Amount cannot exceed campaign goal.
     */
    public function store(Request $request)
    {
        $request->validate([
            'fundme_campaign_id' => 'required|exists:fundme_campaigns,id',
            'amount' => 'required|numeric|min:1',
            'donor_name' => 'nullable|string|max:255',
            'donor_email' => 'required|email',
            'anonymous' => 'boolean',
        ]);

        $campaign = FundMeCampaign::live()->find($request->input('fundme_campaign_id'));
        if (!$campaign) {
            if ($request->expectsJson()) {
                return response()->json(['success' => false, 'error' => 'Campaign not found or not accepting donations.'], 422);
            }
            return back()->withErrors(['campaign' => 'Campaign not found or not accepting donations.']);
        }

        $amountCents = (int) round((float) $request->input('amount') * 100);
        if ($amountCents < 100) {
            if ($request->expectsJson()) {
                return response()->json(['success' => false, 'error' => 'Minimum donation is $1.00.'], 422);
            }
            return back()->withErrors(['amount' => 'Minimum donation is $1.00.']);
        }

        $remainingCents = $campaign->goal_amount - $campaign->raised_amount;
        if ($remainingCents <= 0) {
            if ($request->expectsJson()) {
                return response()->json(['success' => false, 'error' => 'This campaign has already reached its goal.'], 422);
            }
            return back()->withErrors(['amount' => 'This campaign has already reached its goal.']);
        }
        if ($amountCents > $remainingCents) {
            $maxDollars = number_format($remainingCents / 100, 2);
            if ($request->expectsJson()) {
                return response()->json(['success' => false, 'error' => "Maximum donation for this campaign is \${$maxDollars} (goal remaining)."], 422);
            }
            return back()->withErrors(['amount' => "Maximum donation for this campaign is \${$maxDollars}."]);
        }

        $user = $request->user();
        $donorEmail = $request->input('donor_email');
        $donorName = $request->boolean('anonymous') ? null : ($request->input('donor_name'));

        $donation = FundMeDonation::create([
            'fundme_campaign_id' => $campaign->id,
            'organization_id' => $campaign->organization_id,
            'user_id' => $user?->id,
            'amount' => $amountCents,
            'donor_name' => $donorName,
            'donor_email' => $donorEmail,
            'anonymous' => $request->boolean('anonymous'),
            'status' => FundMeDonation::STATUS_PENDING,
            'receipt_number' => FundMeDonation::generateReceiptNumber(),
        ]);

        try {
            $this->setStripeKey();

            $session = StripeCheckoutSession::create([
                'payment_method_types' => ['card'],
                'line_items' => [
                    [
                        'price_data' => [
                            'currency' => 'usd',
                            'product_data' => [
                                'name' => 'Donation: ' . $campaign->title,
                                'description' => $campaign->organization?->name ?? 'Believe FundMe',
                                'images' => $campaign->cover_image ? [asset('storage/' . $campaign->cover_image)] : [],
                            ],
                            'unit_amount' => $amountCents,
                        ],
                        'quantity' => 1,
                    ],
                ],
                'mode' => 'payment',
                'customer_email' => $donorEmail,
                'success_url' => route('fundme.thank-you') . '?session_id={CHECKOUT_SESSION_ID}',
                'cancel_url' => route('fundme.show', ['slug' => $campaign->slug]),
                'metadata' => [
                    'donation_id' => (string) $donation->id,
                    'type' => 'fundme_donation',
                ],
            ]);

            $donation->update(['payment_reference' => $session->id]);
        } catch (\Exception $e) {
            Log::error('FundMe Stripe Checkout session failed', [
                'donation_id' => $donation->id,
                'error' => $e->getMessage(),
            ]);
            $donation->update(['status' => FundMeDonation::STATUS_FAILED]);
            if ($request->expectsJson()) {
                return response()->json(['success' => false, 'error' => 'Payment could not be started. Please try again.'], 500);
            }
            return back()->withErrors(['amount' => 'Payment could not be started. Please try again.']);
        }

        if ($request->expectsJson()) {
            return response()->json(['success' => true, 'url' => $session->url]);
        }
        return redirect()->away($session->url);
    }

    /**
     * Thank-you page: confirm payment from Stripe session (idempotent) and show congratulations.
     */
    public function thankYou(Request $request)
    {
        // Log that we reached this method
        Log::info('FundMe thank-you page accessed', [
            'session_id' => $request->query('session_id'),
            'user_id' => $request->user()?->id,
            'url' => $request->fullUrl(),
        ]);

        $sessionId = $request->query('session_id');
        if (!$sessionId) {
            Log::warning('FundMe thank-you: no session_id provided');
            return redirect()->route('fundme.index')->with('error', 'Invalid thank-you link.');
        }

        try {
            $this->setStripeKey();
            $session = StripeCheckoutSession::retrieve($sessionId, ['expand' => ['payment_intent']]);
            Log::info('FundMe thank-you: Stripe session retrieved', [
                'session_id' => $sessionId,
                'payment_status' => $session->payment_status ?? 'unknown',
            ]);
        } catch (\Exception $e) {
            Log::error('FundMe thank-you: could not retrieve session', [
                'session_id' => $sessionId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return redirect()->route('fundme.index')->with('error', 'Could not verify payment. Please contact support with your receipt number.');
        }

        // Access Stripe metadata - it's a StripeObject, access as properties (like DonationController does)
        if (!isset($session->metadata->donation_id) || !isset($session->metadata->type) || $session->metadata->type !== 'fundme_donation') {
            Log::warning('FundMe thank-you: invalid session metadata', [
                'session_id' => $sessionId,
                'has_metadata' => isset($session->metadata),
                'metadata' => isset($session->metadata) ? (array) $session->metadata : null,
            ]);
            return redirect()->route('fundme.index')->with('error', 'Invalid session. Please contact support if this persists.');
        }

        $donationId = (int) $session->metadata->donation_id;

        $donation = FundMeDonation::find($donationId);
        if (!$donation) {
            Log::error('FundMe thank-you: donation not found', ['donation_id' => $donationId]);
            return redirect()->route('fundme.index')->with('error', 'Donation not found.');
        }

        Log::info('FundMe thank-you: donation found', [
            'donation_id' => $donation->id,
            'status' => $donation->status,
            'campaign_id' => $donation->fundme_campaign_id,
        ]);

        if ($donation->status !== FundMeDonation::STATUS_SUCCEEDED) {
            if ($session->payment_status === 'paid') {
                $donation->update(['status' => FundMeDonation::STATUS_SUCCEEDED]);
                $donation->campaign->increment('raised_amount', $donation->amount);
            } else {
                return redirect()->route('fundme.show', ['slug' => $donation->campaign->slug])
                    ->with('error', 'Payment was not completed.');
            }
        }

        $donation->load(['campaign:id,title,slug', 'campaign.organization:id,name']);
        $campaign = $donation->campaign;

        if (!$campaign) {
            Log::error('FundMe thank-you: campaign not found for donation', ['donation_id' => $donation->id]);
            return redirect()->route('fundme.index')->with('error', 'Campaign not found.');
        }

        Log::info('FundMe thank-you: rendering thank-you page', [
            'donation_id' => $donation->id,
            'campaign_title' => $campaign->title,
            'component_path' => 'frontend/fundme/ThankYou',
        ]);

        try {
            $props = [
                'donation' => [
                    'id' => $donation->id,
                    'amount_dollars' => $donation->amountDollars(),
                    'receipt_number' => $donation->receipt_number,
                    'donor_name' => $donation->anonymous ? null : $donation->donor_name,
                ],
                'campaign' => [
                    'title' => $campaign->title,
                    'slug' => $campaign->slug,
                    'organization_name' => $campaign->organization?->name ?? 'Nonprofit',
                ],
            ];
            
            Log::info('FundMe thank-you: calling Inertia::render', [
                'component' => 'frontend/fundme/ThankYou',
                'props_keys' => array_keys($props),
            ]);
            
            $response = Inertia::render('frontend/fundme/ThankYou', $props);
            
            Log::info('FundMe thank-you: Inertia::render succeeded');
            
            return $response;
        } catch (\Exception $e) {
            Log::error('FundMe thank-you: Inertia render failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'donation_id' => $donation->id,
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            return redirect()->route('fundme.index')->with('error', 'Error loading thank-you page. Your donation was successful. Receipt #' . $donation->receipt_number);
        } catch (\Throwable $e) {
            Log::error('FundMe thank-you: Inertia render failed (Throwable)', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'donation_id' => $donation->id,
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            return redirect()->route('fundme.index')->with('error', 'Error loading thank-you page. Your donation was successful. Receipt #' . $donation->receipt_number);
        }
    }

    private function setStripeKey(): void
    {
        $env = StripeConfigService::getEnvironment();
        $credentials = StripeConfigService::getCredentials($env);
        if ($credentials && !empty($credentials['secret_key'])) {
            Stripe::setApiKey($credentials['secret_key']);
        } else {
            Stripe::setApiKey(config('services.stripe.secret'));
        }
    }
}
