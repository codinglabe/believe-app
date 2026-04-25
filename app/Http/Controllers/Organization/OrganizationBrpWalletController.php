<?php

namespace App\Http\Controllers\Organization;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\OrganizationBrpTransaction;
use App\Services\BrpWalletService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class OrganizationBrpWalletController extends Controller
{
    protected BrpWalletService $walletService;

    public function __construct(BrpWalletService $walletService)
    {
        $this->walletService = $walletService;
    }

    protected function resolveOrg(): Organization
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        if (! $user) abort(403, 'Unauthenticated.');

        $org = Organization::forAuthUser($user);
        if (! $org) abort(403, 'No organisation linked to your account.');

        return $org;
    }

    /**
     * Wallet overview with transaction history.
     */
    public function index(Request $request)
    {
        $org = $this->resolveOrg();
        $wallet = $this->walletService->getOrCreateOrganizationWallet($org->id);

        $transactions = OrganizationBrpTransaction::where('organization_id', $org->id)
            ->orderBy('created_at', 'desc')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Organization/BrpWallet/Index', [
            'wallet' => [
                'balance_brp'       => $wallet->balance_brp,
                'reserved_brp'      => $wallet->reserved_brp,
                'spent_brp'         => $wallet->spent_brp,
                'available_brp'     => $wallet->available_brp,
                'balance_dollars'   => round($wallet->balance_brp * 0.01, 2),
                'available_dollars' => round($wallet->available_brp * 0.01, 2),
            ],
            'transactions' => $transactions,
            'organization' => ['id' => $org->id, 'name' => $org->name],
        ]);
    }

    /**
     * Show buy BRP page.
     */
    public function buyForm()
    {
        $org = $this->resolveOrg();
        $wallet = $this->walletService->getOrCreateOrganizationWallet($org->id);

        return Inertia::render('Organization/BrpWallet/Buy', [
            'wallet' => [
                'balance_brp'   => $wallet->balance_brp,
                'available_brp' => $wallet->available_brp,
            ],
            'packages' => [
                ['brp' => 5000,  'price' => 50,  'label' => '5,000 BRP'],
                ['brp' => 10000, 'price' => 100, 'label' => '10,000 BRP'],
                ['brp' => 25000, 'price' => 250, 'label' => '25,000 BRP'],
                ['brp' => 50000, 'price' => 500, 'label' => '50,000 BRP'],
            ],
            'organization' => ['id' => $org->id, 'name' => $org->name],
        ]);
    }

    /**
     * Create Stripe Checkout session for BRP purchase.
     */
    public function purchase(Request $request)
    {
        $org = $this->resolveOrg();

        $validated = $request->validate([
            'amount_brp' => 'required|integer|min:1000',
        ], [
            'amount_brp.required' => 'Please select or enter a BRP amount.',
            'amount_brp.min'      => 'Minimum purchase is 1,000 BRP ($10).',
        ]);

        $amountBrp   = $validated['amount_brp'];
        $amountCents = $amountBrp; // 1 BRP = $0.01 = 1 cent

        try {
            $stripe = new \Stripe\StripeClient(config('cashier.secret') ?: env('STRIPE_SECRET'));

            $session = $stripe->checkout->sessions->create([
                'payment_method_types' => ['card'],
                'line_items'           => [[
                    'price_data' => [
                        'currency'     => 'usd',
                        'unit_amount'  => $amountCents,
                        'product_data' => [
                            'name'        => "BRP Purchase - {$amountBrp} BRP",
                            'description' => 'Believe Reward Points for Feedback & Rewards campaigns',
                        ],
                    ],
                    'quantity' => 1,
                ]],
                'mode'        => 'payment',
                'success_url' => route('org.wallet.brp.purchase.success') . '?session_id={CHECKOUT_SESSION_ID}',
                'cancel_url'  => route('org.wallet.brp.buy'),
                'metadata'    => [
                    'organization_id' => $org->id,
                    'amount_brp'      => $amountBrp,
                    'type'            => 'org_brp_purchase',
                ],
            ]);

            return Inertia::location($session->url);
        } catch (\Exception $e) {
            Log::error('Org BRP purchase error: ' . $e->getMessage());

            return redirect()->back()
                ->with('error', 'Payment failed: ' . $e->getMessage());
        }
    }

    /**
     * Handle Stripe success redirect.
     */
    public function purchaseSuccess(Request $request)
    {
        $org       = $this->resolveOrg();
        $sessionId = $request->get('session_id');

        if (! $sessionId) {
            return redirect()->route('org.wallet.brp.index')
                ->with('error', 'Invalid payment session.');
        }

        try {
            $stripe  = new \Stripe\StripeClient(config('cashier.secret') ?: env('STRIPE_SECRET'));
            $session = $stripe->checkout->sessions->retrieve($sessionId);

            if ($session->payment_status !== 'paid') {
                return redirect()->route('org.wallet.brp.index')
                    ->with('error', 'Payment was not completed.');
            }

            $alreadyProcessed = OrganizationBrpTransaction::where('stripe_payment_id', $session->payment_intent)
                ->exists();

            if (! $alreadyProcessed) {
                $amountBrp = (int) $session->metadata->amount_brp;
                $this->walletService->purchaseBrpForOrg($org->id, $amountBrp, $session->payment_intent);
            }

            return redirect()->route('org.wallet.brp.index')
                ->with('success', 'BRP purchased successfully!');
        } catch (\Exception $e) {
            Log::error('Org BRP purchase success error: ' . $e->getMessage());

            return redirect()->route('org.wallet.brp.index')
                ->with('error', 'Error processing purchase. Please contact support.');
        }
    }
}
