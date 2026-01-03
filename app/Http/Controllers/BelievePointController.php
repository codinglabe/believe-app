<?php

namespace App\Http\Controllers;

use App\Models\AdminSetting;
use App\Models\BelievePointPurchase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Laravel\Cashier\Cashier;

class BelievePointController extends Controller
{
    /**
     * Display the believe points purchase page.
     */
    public function index(Request $request)
    {
        $user = Auth::user();

        if (!$user) {
            return redirect()->route('login');
        }

        // Check if believe points are enabled
        $isEnabled = (bool) AdminSetting::get('believe_points_enabled', true);
        if (!$isEnabled) {
            return redirect()->route('dashboard')->with('error', 'Believe Points purchases are currently disabled.');
        }

        $minPurchaseAmount = (float) AdminSetting::get('believe_points_min_purchase', 1.00);
        $maxPurchaseAmount = (float) AdminSetting::get('believe_points_max_purchase', 10000.00);

        // Get user's current believe points balance
        $currentBalance = $user->currentBelievePoints();

        // Get user's purchase history
        $purchases = BelievePointPurchase::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return Inertia::render('BelievePoints/Index', [
            'currentBalance' => $currentBalance,
            'minPurchaseAmount' => $minPurchaseAmount,
            'maxPurchaseAmount' => $maxPurchaseAmount,
            'purchases' => $purchases,
        ]);
    }

    /**
     * Create a Stripe checkout session for believe points purchase.
     */
    public function purchase(Request $request)
    {
        $user = Auth::user();

        if (!$user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        // Check if believe points are enabled
        $isEnabled = (bool) AdminSetting::get('believe_points_enabled', true);
        if (!$isEnabled) {
            return response()->json(['error' => 'Believe Points purchases are currently disabled.'], 400);
        }

        $minPurchaseAmount = (float) AdminSetting::get('believe_points_min_purchase', 1.00);
        $maxPurchaseAmount = (float) AdminSetting::get('believe_points_max_purchase', 10000.00);

        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:' . $minPurchaseAmount, 'max:' . $maxPurchaseAmount],
        ]);

        $amount = (float) $validated['amount'];
        $points = $amount; // 1 Believe Point = $1

        try {
            // Create purchase record
            $purchase = BelievePointPurchase::create([
                'user_id' => $user->id,
                'amount' => $amount,
                'points' => $points,
                'status' => 'pending',
            ]);

            // Create Stripe checkout session
            $amountInCents = (int) ($amount * 100);

            $checkoutOptions = [
                'success_url' => route('believe-points.success') . '?session_id={CHECKOUT_SESSION_ID}',
                'cancel_url' => route('believe-points.index'),
                'metadata' => [
                    'purchase_id' => $purchase->id,
                    'user_id' => $user->id,
                    'type' => 'believe_points_purchase',
                ],
                'payment_method_types' => ['card'],
            ];

            $checkout = $user->checkoutCharge(
                $amountInCents,
                "Purchase {$points} Believe Points",
                1,
                $checkoutOptions
            );

            // Update purchase with session ID
            $purchase->update([
                'stripe_session_id' => $checkout->id,
            ]);

            return Inertia::location($checkout->url);
        } catch (\Exception $e) {
            Log::error('Believe Points purchase error: ' . $e->getMessage());
            return redirect()->back()
                ->withInput()
                ->with('error', 'Failed to process purchase: ' . $e->getMessage());
        }
    }

    /**
     * Handle successful payment.
     */
    public function success(Request $request)
    {
        $sessionId = $request->get('session_id');

        if (!$sessionId) {
            return redirect()->route('believe-points.index')->withErrors([
                'message' => 'Invalid purchase session'
            ]);
        }

        try {
            $session = Cashier::stripe()->checkout->sessions->retrieve($sessionId);
            $purchase = BelievePointPurchase::with('user')->findOrFail($session->metadata->purchase_id);

            // Check payment status from Stripe session
            if ($session->payment_status === 'paid' && $session->payment_intent) {
                // Update purchase record
                $purchase->update([
                    'stripe_payment_intent_id' => $session->payment_intent,
                    'status' => 'completed',
                ]);

                // Add believe points to user's account
                $purchase->user->addBelievePoints($purchase->points);

                Log::info('Believe Points added to user account', [
                    'purchase_id' => $purchase->id,
                    'user_id' => $purchase->user_id,
                    'points' => $purchase->points,
                    'new_balance' => $purchase->user->fresh()->believe_points,
                ]);

                return redirect()->route('believe-points.index')
                    ->with('success', "Successfully purchased {$purchase->points} Believe Points!");
            } else {
                $purchase->update(['status' => 'failed']);
                return redirect()->route('believe-points.index')
                    ->with('error', 'Payment was not completed. Please try again.');
            }
        } catch (\Exception $e) {
            Log::error('Believe Points success handler error: ' . $e->getMessage());
            return redirect()->route('believe-points.index')
                ->with('error', 'An error occurred while processing your purchase. Please contact support.');
        }
    }

    /**
     * Handle cancelled payment.
     */
    public function cancel(Request $request)
    {
        $sessionId = $request->get('session_id');

        if ($sessionId) {
            try {
                $session = Cashier::stripe()->checkout->sessions->retrieve($sessionId);
                if (isset($session->metadata->purchase_id)) {
                    $purchase = BelievePointPurchase::find($session->metadata->purchase_id);
                    if ($purchase && $purchase->status === 'pending') {
                        $purchase->update(['status' => 'cancelled']);
                    }
                }
            } catch (\Exception $e) {
                Log::error('Believe Points cancel handler error: ' . $e->getMessage());
            }
        }

        return redirect()->route('believe-points.index')
            ->with('info', 'Purchase was cancelled.');
    }

    /**
     * Display the refund page showing refundable purchases.
     */
    public function refunds(Request $request)
    {
        $user = Auth::user();

        if (!$user) {
            return redirect()->route('login');
        }

        // Get user's current believe points balance
        $currentBalance = $user->currentBelievePoints();

        // Get all completed purchases that can potentially be refunded
        $purchases = BelievePointPurchase::where('user_id', $user->id)
            ->where('status', 'completed')
            ->whereNull('refunded_at')
            ->where('created_at', '>=', now()->subDays(7))
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($purchase) {
                return [
                    'id' => $purchase->id,
                    'amount' => $purchase->amount,
                    'points' => $purchase->points,
                    'created_at' => $purchase->created_at,
                    'can_refund' => $purchase->canBeRefunded() && $purchase->userHasPointsInBalance(),
                    'reason' => !$purchase->canBeRefunded()
                        ? ($purchase->status !== 'completed' ? 'Purchase not completed' : ($purchase->refunded_at ? 'Already refunded' : 'Outside 7-day refund window'))
                        : (!$purchase->userHasPointsInBalance() ? 'Insufficient points in balance' : null),
                ];
            });

        // Get refund history (all refunded purchases)
        $refundHistory = BelievePointPurchase::where('user_id', $user->id)
            ->where('status', 'completed')
            ->whereNotNull('refunded_at')
            ->orderBy('refunded_at', 'desc')
            ->get()
            ->map(function ($purchase) {
                return [
                    'id' => $purchase->id,
                    'amount' => $purchase->amount,
                    'points' => $purchase->points,
                    'created_at' => $purchase->created_at,
                    'refunded_at' => $purchase->refunded_at,
                    'refund_status' => $purchase->refund_status,
                    'stripe_refund_id' => $purchase->stripe_refund_id,
                ];
            });

        return Inertia::render('BelievePoints/Refunds', [
            'currentBalance' => $currentBalance,
            'purchases' => $purchases,
            'refundHistory' => $refundHistory,
        ]);
    }

    /**
     * Process a refund for a believe points purchase.
     */
    public function refund(Request $request, $purchaseId)
    {
        Log::info('Believe Points refund: Request received', [
            'purchase_id' => $purchaseId,
            'user_id' => Auth::id(),
            'request_data' => $request->all(),
        ]);

        $user = Auth::user();

        if (!$user) {
            Log::warning('Believe Points refund: Unauthorized', [
                'purchase_id' => $purchaseId,
            ]);
            return redirect()->route('believe-points.refunds')
                ->with('error', 'Unauthorized. Please log in to process refunds.');
        }

        // Find the purchase by ID
        $purchase = BelievePointPurchase::find($purchaseId);

        if (!$purchase) {
            Log::warning('Believe Points refund: Purchase not found', [
                'purchase_id' => $purchaseId,
                'user_id' => $user->id,
            ]);
            return redirect()->route('believe-points.refunds')
                ->with('error', 'Purchase not found.');
        }

        Log::info('Believe Points refund: Purchase found', [
            'purchase_id' => $purchase->id,
            'user_id' => $user->id,
            'purchase_user_id' => $purchase->user_id,
            'status' => $purchase->status,
            'refunded_at' => $purchase->refunded_at,
            'stripe_payment_intent_id' => $purchase->stripe_payment_intent_id,
        ]);

        // Verify ownership
        if ($purchase->user_id !== $user->id) {
            return redirect()->route('believe-points.refunds')
                ->with('error', 'You are not authorized to refund this purchase.');
        }

        // Check if purchase can be refunded
        if (!$purchase->canBeRefunded()) {
            $reason = 'This purchase cannot be refunded.';
            if ($purchase->status !== 'completed') {
                $reason = 'This purchase was not completed.';
            } elseif ($purchase->refunded_at !== null) {
                $reason = 'This purchase has already been refunded.';
            } elseif ($purchase->created_at->lt(now()->subDays(7))) {
                $reason = 'This purchase is outside the 7-day refund window.';
            } elseif (!$purchase->stripe_payment_intent_id) {
                $reason = 'No payment information found for this purchase.';
            }

            return redirect()->route('believe-points.refunds')
                ->with('error', $reason);
        }

        // Check if user still has the points in balance
        if (!$purchase->userHasPointsInBalance()) {
            return redirect()->route('believe-points.refunds')
                ->with('error', 'Refund not possible. You no longer have these points in your balance.');
        }

        try {
            DB::beginTransaction();

            // Process Stripe refund
            if (!$purchase->stripe_payment_intent_id) {
                DB::rollBack();
                Log::error('Believe Points refund: No payment intent', [
                    'purchase_id' => $purchase->id,
                    'user_id' => $user->id,
                ]);
                return redirect()->route('believe-points.refunds')
                    ->with('error', 'No payment information found for this purchase. Cannot process refund.');
            }

            Log::info('Believe Points refund: Processing Stripe refund', [
                'purchase_id' => $purchase->id,
                'user_id' => $user->id,
                'payment_intent' => $purchase->stripe_payment_intent_id,
                'amount' => $purchase->amount,
            ]);

            // Use Cashier's Stripe client which is already configured
            $stripe = Cashier::stripe();
            $refund = $stripe->refunds->create([
                'payment_intent' => $purchase->stripe_payment_intent_id,
                'amount' => (int) ($purchase->amount * 100), // Convert to cents
                'reason' => 'requested_by_customer',
            ]);

            Log::info('Believe Points refund: Stripe refund created', [
                'purchase_id' => $purchase->id,
                'refund_id' => $refund->id,
                'refund_status' => $refund->status,
            ]);

            // Check refund status
            if ($refund->status === 'succeeded' || $refund->status === 'pending') {
                // Deduct points from user's balance
                $user->refresh(); // Refresh to get latest balance
                if (!$user->deductBelievePoints($purchase->points)) {
                    DB::rollBack();
                    Log::error('Believe Points refund: Failed to deduct points', [
                        'purchase_id' => $purchase->id,
                        'user_id' => $user->id,
                        'points_to_deduct' => $purchase->points,
                        'current_balance' => $user->believe_points,
                    ]);
                    return redirect()->route('believe-points.refunds')
                        ->with('error', 'Failed to deduct points from balance. Please contact support.');
                }

                // Update purchase record
                $purchase->update([
                    'stripe_refund_id' => $refund->id,
                    'refunded_at' => now(),
                    'refund_status' => $refund->status,
                ]);

                DB::commit();

                $user->refresh(); // Refresh to get latest balance

                Log::info('Believe Points refund processed successfully', [
                    'purchase_id' => $purchase->id,
                    'user_id' => $user->id,
                    'points' => $purchase->points,
                    'refund_id' => $refund->id,
                    'refund_status' => $refund->status,
                    'new_balance' => $user->believe_points,
                    'refund_amount' => $purchase->amount,
                ]);

                return redirect()->route('believe-points.refunds')
                    ->with('success', "Refund processed successfully! {$purchase->points} Believe Points have been deducted from your balance. The refund of {$purchase->amount} will be processed to your original payment method within 5-10 business days.");
            } else {
                DB::rollBack();
                Log::error('Believe Points refund: Invalid refund status', [
                    'purchase_id' => $purchase->id,
                    'refund_status' => $refund->status,
                ]);
                return redirect()->route('believe-points.refunds')
                    ->with('error', 'Refund failed with status: ' . $refund->status . '. Please contact support.');
            }
        } catch (\Stripe\Exception\ApiErrorException $e) {
            DB::rollBack();
            Log::error('Believe Points refund: Stripe API error', [
                'purchase_id' => $purchase->id ?? null,
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'stripe_code' => $e->getStripeCode(),
            ]);
            return redirect()->route('believe-points.refunds')
                ->with('error', 'Failed to process refund: ' . $e->getMessage() . '. Please contact support if this issue persists.');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Believe Points refund: General error', [
                'purchase_id' => $purchase->id ?? null,
                'user_id' => $user->id ?? null,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return redirect()->route('believe-points.refunds')
                ->with('error', 'Failed to process refund: ' . $e->getMessage() . '. Please contact support if this issue persists.');
        }
    }
}
