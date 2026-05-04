<?php

namespace App\Http\Controllers\Merchant;

use App\Http\Controllers\Controller;
use App\Models\MerchantBrpCampaign;
use App\Models\MerchantBrpTransaction;
use App\Services\BrpWalletService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class MerchantBrpCampaignController extends Controller
{
    private const PLATFORM_FEE_RATE = 0.045;

    private const PROCESSING_FEE_RATE = 0.035;

    /** 1 product BRP = $0.01; wallet stores 1 unit = $1.00 budget BP. */
    public const BRP_PER_USD = 100;

    public function __construct(
        protected BrpWalletService $walletService
    ) {}

    public function playbooks()
    {
        return Inertia::render('merchant/Playbooks/Index');
    }

    /**
     * Fund BRP campaign wizard (single page).
     */
    public function create()
    {
        $merchant = Auth::guard('merchant')->user();
        $wallet = $this->walletService->getOrCreateMerchantWallet($merchant->id);
        $availableMerchantBrp = (int) round($wallet->available_brp * self::BRP_PER_USD);

        return Inertia::render('merchant/BrpCampaign/Fund', [
            'wallet' => [
                'available_merchant_brp' => $availableMerchantBrp,
                'available_bp' => $wallet->available_brp,
            ],
        ]);
    }

    /**
     * BRP marketing campaigns list.
     */
    public function index()
    {
        $merchant = Auth::guard('merchant')->user();
        $campaigns = MerchantBrpCampaign::where('merchant_id', $merchant->id)
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (MerchantBrpCampaign $c) => [
                'id' => $c->id,
                'name' => $c->name,
                'fund_amount_usd' => (float) $c->fund_amount_usd,
                'merchant_brp_amount' => $c->merchant_brp_amount,
                'status' => $c->status,
                'award_triggers' => $c->award_triggers ?? [],
                'created_at' => $c->created_at?->toIso8601String(),
            ]);

        $wallet = $this->walletService->getOrCreateMerchantWallet($merchant->id);
        $availableMerchantBrp = (int) round($wallet->available_brp * self::BRP_PER_USD);

        return Inertia::render('merchant/BrpCampaign/Index', [
            'campaigns' => $campaigns,
            'wallet' => ['available_merchant_brp' => $availableMerchantBrp],
        ]);
    }

    /**
     * Create pending campaign + redirect to Stripe Checkout.
     */
    public function startCheckout(Request $request)
    {
        $merchant = Auth::guard('merchant')->user();

        $validated = $request->validate([
            'fund_amount_usd' => 'required|numeric|min:10|max:500000',
            'name' => 'nullable|string|max:120',
            'award_triggers' => 'required|array|min:1',
            'award_triggers.*' => 'string|in:offer_engagement,purchase,visit,referral,review,promo_push',
            'trigger_rules' => 'required|array|min:1',
            'trigger_rules.*.trigger' => 'required|string|in:offer_engagement,purchase,visit,referral,review,promo_push',
            'trigger_rules.*.spend_amount_usd' => 'nullable|numeric|min:0',
            'trigger_rules.*.award_brp' => 'required|integer|min:1|max:10000000',
            'trigger_rules.*.limit_per_user_brp' => 'required|integer|min:1|max:10000000',
            'trigger_rules.*.expiry_days' => 'required|integer|min:1|max:3650',
        ]);

        $fundUsd = round((float) $validated['fund_amount_usd'], 2);
        $internalBp = (int) max(10, round($fundUsd));
        $merchantBrp = (int) round($fundUsd * self::BRP_PER_USD);

        $campaign = MerchantBrpCampaign::create([
            'merchant_id' => $merchant->id,
            'name' => $validated['name'] ?? null,
            'fund_amount_usd' => $fundUsd,
            'merchant_brp_amount' => $merchantBrp,
            'award_triggers' => $validated['award_triggers'],
            'trigger_rules' => $validated['trigger_rules'],
            'status' => 'pending_payment',
        ]);

        $amountCents = $internalBp * 100;
        $platformFeeCents = (int) round($amountCents * self::PLATFORM_FEE_RATE);
        $processingFeeCents = (int) round($amountCents * self::PROCESSING_FEE_RATE);
        $totalChargeCents = $amountCents + $platformFeeCents + $processingFeeCents;

        try {
            $stripe = new \Stripe\StripeClient(config('cashier.secret') ?: env('STRIPE_SECRET'));

            $session = $stripe->checkout->sessions->create([
                'payment_method_types' => ['card'],
                'line_items' => array_values(array_filter([
                    [
                        'price_data' => [
                            'currency' => 'usd',
                            'unit_amount' => $amountCents,
                            'product_data' => [
                                'name' => "Merchant BRP fund — {$merchantBrp} BRP",
                                'description' => 'Budget for your BRP campaign (1 BRP = $0.01). 100% credited to your BRP bank.',
                            ],
                        ],
                        'quantity' => 1,
                    ],
                    $platformFeeCents > 0 ? [
                        'price_data' => [
                            'currency' => 'usd',
                            'unit_amount' => $platformFeeCents,
                            'product_data' => [
                                'name' => 'Platform Fee (4.5%)',
                            ],
                        ],
                        'quantity' => 1,
                    ] : null,
                    $processingFeeCents > 0 ? [
                        'price_data' => [
                            'currency' => 'usd',
                            'unit_amount' => $processingFeeCents,
                            'product_data' => [
                                'name' => 'Processing Fee (3.5%)',
                            ],
                        ],
                        'quantity' => 1,
                    ] : null,
                ])),
                'mode' => 'payment',
                'success_url' => route('merchant.brp-funding.success').'?session_id={CHECKOUT_SESSION_ID}',
                'cancel_url' => route('merchant.brp-funding'),
                'metadata' => [
                    'type' => 'brp_campaign_funding',
                    'campaign_id' => (string) $campaign->id,
                    'merchant_id' => (string) $merchant->id,
                    'amount_brp' => (string) $internalBp,
                ],
            ]);

            return Inertia::location($session->url);
        } catch (\Exception $e) {
            Log::error('BRP campaign checkout: '.$e->getMessage());
            $campaign->delete();

            return redirect()->back()
                ->with('error', 'Checkout could not be started: '.$e->getMessage());
        }
    }

    public function fundingSuccess(Request $request)
    {
        $merchant = Auth::guard('merchant')->user();
        $sessionId = $request->get('session_id');

        if (! $sessionId) {
            return redirect()->route('merchant.brp-funding')
                ->with('error', 'Invalid payment session.');
        }

        try {
            $stripe = new \Stripe\StripeClient(config('cashier.secret') ?: env('STRIPE_SECRET'));
            $session = $stripe->checkout->sessions->retrieve($sessionId);

            if ($session->payment_status !== 'paid') {
                return redirect()->route('merchant.brp-funding')
                    ->with('error', 'Payment was not completed.');
            }

            if (($session->metadata->type ?? '') !== 'brp_campaign_funding') {
                return redirect()->route('merchant.brp-funding')
                    ->with('error', 'This session is not a BRP campaign payment.');
            }

            $campaignId = (int) $session->metadata->campaign_id;
            $campaign = MerchantBrpCampaign::where('id', $campaignId)
                ->where('merchant_id', $merchant->id)
                ->first();

            if (! $campaign) {
                return redirect()->route('merchant.brp-funding')
                    ->with('error', 'Campaign not found.');
            }

            $paymentIntent = $session->payment_intent;
            $paymentIntentId = is_string($paymentIntent) ? $paymentIntent : null;

            if ($campaign->status === 'active' && $campaign->stripe_payment_intent === $paymentIntentId) {
                return redirect()->route('merchant.brp-campaigns.index')
                    ->with('success', 'Campaign is already active.');
            }

            $amountBrp = (int) $session->metadata->amount_brp;

            $alreadyProcessed = $paymentIntentId
                && MerchantBrpTransaction::where('stripe_payment_id', $paymentIntentId)->exists();

            if (! $alreadyProcessed) {
                $this->walletService->purchaseBrp(
                    $merchant->id,
                    $amountBrp,
                    $paymentIntentId
                );
            }

            $campaign->update([
                'status' => 'active',
                'stripe_payment_intent' => $paymentIntentId,
            ]);

            return redirect()->route('merchant.brp-campaigns.index')
                ->with('success', 'Your BRP campaign is funded and live.');
        } catch (\Exception $e) {
            Log::error('BRP campaign funding success: '.$e->getMessage());

            return redirect()->route('merchant.brp-funding')
                ->with('error', 'Could not confirm payment. Please contact support.');
        }
    }
}
