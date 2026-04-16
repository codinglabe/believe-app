<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use App\Support\StripeCustomerChargeAmount;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Laravel\Cashier\Cashier;

class CreditPurchaseController extends Controller
{
    /**
     * Show the credit purchase page
     */
    public function index()
    {
        $user = auth()->user();

        return Inertia::render('Credits/Purchase', [
            'currentCredits' => $user->credits ?? 0,
            'price' => 1.00, // $1
            'credits' => 50000, // 50000 credits
        ]);
    }

    /**
     * Create Stripe checkout session for credit purchase
     */
    public function checkout(Request $request)
    {
        $request->validate([
            'amount' => ['required', 'numeric', 'min:1'],
            'return_route' => ['nullable', 'string'],
        ]);

        try {
            $user = $request->user();
            $amount = $request->amount; // $1
            $creditsToAdd = 50000; // 50000 credits per $1
            $returnRoute = $request->input('return_route', 'ai-chat.index'); // Default to AI chat

            $amountInCents = StripeCustomerChargeAmount::chargeCentsFromNetUsd((float) $amount, 'card');

            // Record pending transaction
            $transaction = $user->recordTransaction([
                'type' => 'credit_purchase',
                'amount' => $amount,
                'payment_method' => 'stripe',
                'status' => 'pending',
                'meta' => [
                    'credits_to_add' => $creditsToAdd,
                    'description' => "Purchase {$creditsToAdd} credits",
                ],
            ]);

            // Create checkout session
            $checkout = $user->checkoutCharge(
                $amountInCents,
                "Purchase {$creditsToAdd} Credits",
                1,
                [
                    'success_url' => route('credits.success').'?session_id={CHECKOUT_SESSION_ID}&return_route='.urlencode($returnRoute),
                    'cancel_url' => route('credits.cancel').'?return_route='.urlencode($returnRoute),
                    'metadata' => [
                        'user_id' => $user->id,
                        'transaction_id' => $transaction->id,
                        'type' => 'credit_purchase',
                        'credits_to_add' => $creditsToAdd,
                        'amount' => $amount,
                        'return_route' => $returnRoute,
                    ],
                    'payment_method_types' => ['card'],
                ]
            );

            // Return Inertia redirect to Stripe checkout
            return Inertia::location($checkout->url);

        } catch (\Exception $e) {
            Log::error('Credit purchase checkout error', [
                'error' => $e->getMessage(),
                'user_id' => $request->user()->id,
            ]);

            return back()->withErrors([
                'message' => 'Failed to create checkout session. Please try again.',
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Handle successful payment
     */
    public function success(Request $request)
    {
        try {
            $sessionId = $request->query('session_id');
            $returnRoute = $request->query('return_route', 'ai-chat.index');

            if (! $sessionId) {
                return redirect()->route($returnRoute)->with('error', 'Invalid session ID.');
            }

            $user = $request->user();

            // Retrieve the checkout session from Stripe
            $session = Cashier::stripe()->checkout->sessions->retrieve($sessionId);

            if ($session->payment_status !== 'paid') {
                return redirect()->route($returnRoute)->with('error', 'Payment was not completed.');
            }

            // Get metadata from session
            $metadata = $session->metadata ?? [];
            $creditsToAdd = (int) ($metadata['credits_to_add'] ?? 50000);
            $transactionId = $metadata['transaction_id'] ?? null;
            $returnRouteFromMetadata = $metadata['return_route'] ?? $returnRoute;

            // Add wallet credits
            $user->increment('credits', $creditsToAdd);

            // Same top-up extends plan AI token allowance (used vs included), matching user expectation for
            // "Top up" in AI Chat / newsletter. Skip when ai_tokens_included is 0 (treated as unlimited cap).
            $aiTokensIncludedAdded = 0;
            $includedBefore = (int) ($user->fresh()->ai_tokens_included ?? 0);
            if ($includedBefore > 0) {
                $user->increment('ai_tokens_included', $creditsToAdd);
                $aiTokensIncludedAdded = $creditsToAdd;
            }

            // Update transaction status
            if ($transactionId) {
                $tx = Transaction::find($transactionId);
                Transaction::where('id', $transactionId)->update([
                    'status' => 'completed',
                    'meta' => array_merge(
                        $tx?->meta ?? [],
                        [
                            'stripe_session_id' => $sessionId,
                            'stripe_payment_intent' => $session->payment_intent,
                            'payment_status' => $session->payment_status,
                            'credits_added' => $creditsToAdd,
                            'ai_tokens_included_added' => $aiTokensIncludedAdded,
                        ]
                    ),
                ]);
            }

            Log::info('Credits purchased successfully', [
                'user_id' => $user->id,
                'credits_added' => $creditsToAdd,
                'ai_tokens_included_added' => $aiTokensIncludedAdded,
                'session_id' => $sessionId,
                'return_route' => $returnRouteFromMetadata,
            ]);

            $successMsg = "Successfully purchased {$creditsToAdd} wallet credits.";
            if ($aiTokensIncludedAdded > 0) {
                $successMsg .= " Your plan AI token allowance increased by {$aiTokensIncludedAdded} (same pool as AI Chat).";
            }

            return redirect()->route($returnRouteFromMetadata)->with('success', $successMsg);
        } catch (\Exception $e) {
            Log::error('Credit purchase success handler error', [
                'error' => $e->getMessage(),
                'session_id' => $request->query('session_id'),
            ]);

            return redirect()->route('ai-chat.index')->with('error', 'Error processing payment. Please contact support.');
        }
    }

    /**
     * Handle cancelled payment
     */
    public function cancel(Request $request)
    {
        $returnRoute = $request->query('return_route', 'ai-chat.index');

        return redirect()->route($returnRoute)->with('info', 'Payment was cancelled.');
    }

    /**
     * Handle Stripe webhook for payment confirmation
     * Note: This is handled by Laravel Cashier's webhook system
     * But we can add additional logic here if needed
     */
    public function webhook(Request $request)
    {
        // Laravel Cashier handles the webhook verification and processing
        // This method can be used for additional credit processing if needed
        // The actual webhook should be configured in Stripe dashboard to point to:
        // /stripe/webhook (Cashier's default webhook endpoint)

        return response()->json(['status' => 'success']);
    }
}
