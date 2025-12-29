<?php

namespace App\Http\Controllers;

use App\Models\AdminSetting;
use App\Models\BelievePointPurchase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
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
}
