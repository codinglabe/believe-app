<?php

namespace App\Http\Controllers\Merchant;

use App\Http\Controllers\Controller;
use App\Models\MerchantBrpTransaction;
use App\Services\BrpWalletService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class MerchantBrpWalletController extends Controller
{
    private const PLATFORM_FEE_RATE = 0.045;
    private const PROCESSING_FEE_RATE = 0.035;

    protected BrpWalletService $walletService;

    public function __construct(BrpWalletService $walletService)
    {
        $this->walletService = $walletService;
    }

    /**
     * Wallet overview with transaction history.
     */
    public function index(Request $request)
    {
        $merchant = Auth::guard('merchant')->user();
        $wallet = $this->walletService->getOrCreateMerchantWallet($merchant->id);

        $transactions = MerchantBrpTransaction::where('merchant_id', $merchant->id)
            ->orderBy('created_at', 'desc')
            ->paginate(20)
            ->withQueryString()
            ->through(function (MerchantBrpTransaction $t) {
                $amount = (int) $t->amount_brp;
                // Payout uses US-cent precision in this column (3 = $0.03). Other types use whole BP (1 BP = $1.00).
                $payoutCents = $t->type === 'payout';
                $amountBpDisplay = $payoutCents ? round($amount / 100, 2) : (float) $amount;
                $amountDollars = $amountBpDisplay;

                return [
                    'id' => $t->id,
                    'type' => $t->type,
                    'amount_brp' => $amount,
                    'amount_bp_display' => $amountBpDisplay,
                    'amount_dollars' => $amountDollars,
                    'description' => $t->description,
                    'created_at' => $t->created_at?->toIso8601String(),
                ];
            });

        // `spent_brp` column is accumulated in the same US-cent units as campaign rewards (3 = $0.03, not 3 BP). Convert for display: 1 BP = $1.00.
        $spentToSupportersDisplay = round($wallet->spent_brp / 100, 2);

        return Inertia::render('merchant/BrpWallet/Index', [
            'wallet' => [
                'balance_brp' => $wallet->balance_brp,
                'reserved_brp' => $wallet->reserved_brp,
                'spent_brp' => $wallet->spent_brp,
                'available_brp' => $wallet->available_brp,
                'balance_dollars' => round($wallet->balance_brp, 2),
                'available_dollars' => round($wallet->available_brp, 2),
                'reserved_dollars' => round($wallet->reserved_brp, 2),
                'sent_bp' => $spentToSupportersDisplay,
                'sent_dollars' => $spentToSupportersDisplay,
            ],
            'transactions' => $transactions,
        ]);
    }

    /**
     * Show buy BRP page.
     */
    public function buyForm(Request $request)
    {
        $merchant = Auth::guard('merchant')->user();
        $wallet = $this->walletService->getOrCreateMerchantWallet($merchant->id);

        $amountBp = (int) ($request->get('fee_preview_amount_bp') ?? 0);
        $amountBp = max(0, $amountBp);
        $budgetUsd = (float) $amountBp; // 1 BP = $1.00
        $platformFeeUsd = $budgetUsd > 0 ? round($budgetUsd * self::PLATFORM_FEE_RATE, 2) : 0.0;
        $processingFeeUsd = $budgetUsd > 0 ? round($budgetUsd * self::PROCESSING_FEE_RATE, 2) : 0.0;
        $checkoutTotalUsd = $budgetUsd + $platformFeeUsd + $processingFeeUsd;

        return Inertia::render('merchant/BrpWallet/Buy', [
            'wallet' => [
                'balance_brp' => $wallet->balance_brp,
                'available_brp' => $wallet->available_brp,
            ],
            'packages' => [
                ['brp' => 50, 'price' => 50, 'label' => '50 BP'],
                ['brp' => 100, 'price' => 100, 'label' => '100 BP'],
                ['brp' => 250, 'price' => 250, 'label' => '250 BP'],
                ['brp' => 500, 'price' => 500, 'label' => '500 BP'],
            ],
            'feePreview' => $amountBp > 0 ? [
                'budget_usd' => round($budgetUsd, 2),
                'platform_fee_usd' => $platformFeeUsd,
                'processing_fee_usd' => $processingFeeUsd,
                'checkout_total_usd' => round($checkoutTotalUsd, 2),
            ] : null,
        ]);
    }

    /**
     * Create Stripe Checkout session for BRP purchase.
     */
    public function purchase(Request $request)
    {
        $merchant = Auth::guard('merchant')->user();

        $validated = $request->validate([
            'amount_brp' => 'required|integer|min:10',
        ], [
            'amount_brp.required' => 'Please select or enter a BP amount.',
            'amount_brp.min' => 'Minimum purchase is 10 BP ($10).',
        ]);

        $amountBrp = $validated['amount_brp'];
        // 1 BP = $1.00 => 100 cents
        $amountCents = $amountBrp * 100;
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
                                'name' => "BP Budget - {$amountBrp} BP",
                                'description' => '100% of your budget is credited as BP (1 BP = $1.00).',
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
                                'description' => 'Platform fee is added on top of your BP budget.',
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
                                'description' => 'Processing fee is added on top of your BP budget.',
                            ],
                        ],
                        'quantity' => 1,
                    ] : null,
                ])),
                'mode' => 'payment',
                'success_url' => route('wallet.brp.purchase.success') . '?session_id={CHECKOUT_SESSION_ID}',
                'cancel_url' => route('wallet.brp.buy'),
                'metadata' => [
                    'merchant_id' => $merchant->id,
                    'amount_brp' => $amountBrp,
                    'budget_cents' => $amountCents,
                    'platform_fee_cents' => $platformFeeCents,
                    'processing_fee_cents' => $processingFeeCents,
                    'total_charge_cents' => $totalChargeCents,
                    'type' => 'brp_purchase',
                ],
            ]);

            return Inertia::location($session->url);
        } catch (\Exception $e) {
            Log::error('BRP purchase error: ' . $e->getMessage());

            return redirect()->back()
                ->with('error', 'Payment failed: ' . $e->getMessage());
        }
    }

    /**
     * Handle Stripe success redirect.
     */
    public function purchaseSuccess(Request $request)
    {
        $merchant = Auth::guard('merchant')->user();
        $sessionId = $request->get('session_id');

        if (!$sessionId) {
            return redirect()->route('wallet.brp.index')
                ->with('error', 'Invalid payment session.');
        }

        try {
            $stripe = new \Stripe\StripeClient(config('cashier.secret') ?: env('STRIPE_SECRET'));
            $session = $stripe->checkout->sessions->retrieve($sessionId);

            if ($session->payment_status !== 'paid') {
                return redirect()->route('wallet.brp.index')
                    ->with('error', 'Payment was not completed.');
            }

            // Check if already processed
            $alreadyProcessed = MerchantBrpTransaction::where('stripe_payment_id', $session->payment_intent)
                ->exists();

            if (!$alreadyProcessed) {
                $amountBrp = (int) $session->metadata->amount_brp;

                $this->walletService->purchaseBrp(
                    $merchant->id,
                    $amountBrp,
                    $session->payment_intent
                );
            }

            return redirect()->route('wallet.brp.index')
                ->with('success', 'BP purchased successfully!');
        } catch (\Exception $e) {
            Log::error('BRP purchase success error: ' . $e->getMessage());

            return redirect()->route('wallet.brp.index')
                ->with('error', 'Error processing purchase. Please contact support.');
        }
    }
}
