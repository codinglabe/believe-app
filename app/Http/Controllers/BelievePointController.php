<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessBelievePointsAutoReplenishJob;
use App\Models\AdminSetting;
use App\Models\BelievePointPurchase;
use App\Services\BelievePointsPaymentMethodSyncService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Laravel\Cashier\Cashier;
use Stripe\Exception\ApiErrorException;

class BelievePointController extends Controller
{
    /**
     * Display the believe points purchase page.
     */
    public function index(Request $request)
    {
        $user = Auth::user();

        if (! $user) {
            return redirect()->route('login');
        }

        // Check if believe points are enabled
        $isEnabled = (bool) AdminSetting::get('believe_points_enabled', true);
        if (! $isEnabled) {
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
            'autoReplenish' => [
                'enabled' => (bool) $user->believe_points_auto_replenish_enabled,
                'threshold' => $user->believe_points_auto_replenish_threshold !== null
                    ? (float) $user->believe_points_auto_replenish_threshold
                    : null,
                'amount' => $user->believe_points_auto_replenish_amount !== null
                    ? (float) $user->believe_points_auto_replenish_amount
                    : null,
                'has_payment_method' => filled($user->believe_points_auto_replenish_pm_id),
                'card_brand' => $user->believe_points_auto_replenish_card_brand,
                'card_last4' => $user->believe_points_auto_replenish_card_last4,
                'last_replenish_at' => $user->believe_points_last_auto_replenish_at?->toIso8601String(),
            ],
        ]);
    }

    /**
     * Create a Stripe checkout session for believe points purchase.
     */
    public function purchase(Request $request)
    {
        $user = Auth::user();

        if (! $user) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        // Check if believe points are enabled
        $isEnabled = (bool) AdminSetting::get('believe_points_enabled', true);
        if (! $isEnabled) {
            return response()->json(['error' => 'Believe Points purchases are currently disabled.'], 400);
        }

        $minPurchaseAmount = (float) AdminSetting::get('believe_points_min_purchase', 1.00);
        $maxPurchaseAmount = (float) AdminSetting::get('believe_points_max_purchase', 10000.00);

        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:'.$minPurchaseAmount, 'max:'.$maxPurchaseAmount],
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
                'source' => 'manual',
            ]);

            // Create Stripe checkout session
            $amountInCents = (int) ($amount * 100);

            $checkoutOptions = [
                'success_url' => route('believe-points.success').'?session_id={CHECKOUT_SESSION_ID}',
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
            Log::error('Believe Points purchase error: '.$e->getMessage());

            return redirect()->back()
                ->withInput()
                ->with('error', 'Failed to process purchase: '.$e->getMessage());
        }
    }

    /**
     * Handle successful payment.
     */
    public function success(Request $request)
    {
        $sessionId = $request->get('session_id');

        if (! $sessionId) {
            return redirect()->route('believe-points.index')->withErrors([
                'message' => 'Invalid purchase session',
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
            Log::error('Believe Points success handler error: '.$e->getMessage());

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
                Log::error('Believe Points cancel handler error: '.$e->getMessage());
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

        if (! $user) {
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
                    'reason' => ! $purchase->canBeRefunded()
                        ? ($purchase->status !== 'completed' ? 'Purchase not completed' : ($purchase->refunded_at ? 'Already refunded' : 'Outside 7-day refund window'))
                        : (! $purchase->userHasPointsInBalance() ? 'Insufficient points in balance' : null),
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

        if (! $user) {
            Log::warning('Believe Points refund: Unauthorized', [
                'purchase_id' => $purchaseId,
            ]);

            return redirect()->route('believe-points.refunds')
                ->with('error', 'Unauthorized. Please log in to process refunds.');
        }

        // Find the purchase by ID
        $purchase = BelievePointPurchase::find($purchaseId);

        if (! $purchase) {
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
        if (! $purchase->canBeRefunded()) {
            $reason = 'This purchase cannot be refunded.';
            if ($purchase->status !== 'completed') {
                $reason = 'This purchase was not completed.';
            } elseif ($purchase->refunded_at !== null) {
                $reason = 'This purchase has already been refunded.';
            } elseif ($purchase->created_at->lt(now()->subDays(7))) {
                $reason = 'This purchase is outside the 7-day refund window.';
            } elseif (! $purchase->stripe_payment_intent_id) {
                $reason = 'No payment information found for this purchase.';
            }

            return redirect()->route('believe-points.refunds')
                ->with('error', $reason);
        }

        // Check if user still has the points in balance
        if (! $purchase->userHasPointsInBalance()) {
            return redirect()->route('believe-points.refunds')
                ->with('error', 'Refund not possible. You no longer have these points in your balance.');
        }

        try {
            DB::beginTransaction();

            // Process Stripe refund
            if (! $purchase->stripe_payment_intent_id) {
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
                if (! $user->deductBelievePoints($purchase->points)) {
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
                    ->with('error', 'Refund failed with status: '.$refund->status.'. Please contact support.');
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
                ->with('error', 'Failed to process refund: '.$e->getMessage().'. Please contact support if this issue persists.');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Believe Points refund: General error', [
                'purchase_id' => $purchase->id ?? null,
                'user_id' => $user->id ?? null,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return redirect()->route('believe-points.refunds')
                ->with('error', 'Failed to process refund: '.$e->getMessage().'. Please contact support if this issue persists.');
        }
    }

    /**
     * Save auto top-up preferences (threshold, amount, on/off).
     */
    public function updateAutoReplenishSettings(Request $request): RedirectResponse
    {
        $user = Auth::user();
        if (! $user) {
            return redirect()->route('login');
        }

        $isEnabled = (bool) AdminSetting::get('believe_points_enabled', true);
        if (! $isEnabled) {
            return redirect()->route('believe-points.index')
                ->with('error', 'Believe Points purchases are currently disabled.');
        }

        $minPurchaseAmount = (float) AdminSetting::get('believe_points_min_purchase', 1.00);
        $maxPurchaseAmount = (float) AdminSetting::get('believe_points_max_purchase', 10000.00);

        $enabled = $request->boolean('enabled');

        if ($enabled) {
            $validated = $request->validate([
                'enabled' => ['required', 'boolean'],
                'threshold' => ['required', 'numeric', 'min:0', 'max:100000'],
                'amount' => ['required', 'numeric', 'min:'.$minPurchaseAmount, 'max:'.$maxPurchaseAmount],
                'auto_replenish_policy_accepted' => ['accepted'],
            ]);
            if (! $user->believe_points_auto_replenish_pm_id) {
                return redirect()->route('believe-points.index')
                    ->with('error', 'Add a saved card for auto top-up before turning this on.');
            }
            $threshold = (float) $validated['threshold'];
            $amount = (float) $validated['amount'];
            $user->update([
                'believe_points_auto_replenish_enabled' => true,
                'believe_points_auto_replenish_threshold' => $threshold,
                'believe_points_auto_replenish_amount' => $amount,
                'believe_points_auto_replenish_agreed_at' => now(),
            ]);

            $user->refresh();
            Bus::dispatchSync(new ProcessBelievePointsAutoReplenishJob($user->id));

            return redirect()->route('believe-points.index')
                ->with('success', 'Auto top-up is on. We charge your saved card when your balance is at or below your threshold (including right now if that already applies). At most once per hour.');
        }

        $request->validate([
            'enabled' => ['required', 'boolean'],
        ]);

        $user->update([
            'believe_points_auto_replenish_enabled' => false,
        ]);

        return redirect()->route('believe-points.index')
            ->with('success', 'Auto top-up is turned off.');
    }

    /**
     * Stripe Checkout (setup mode) to save a card for off-session auto charges.
     */
    public function autoReplenishSetupPayment(Request $request)
    {
        $user = Auth::user();
        if (! $user) {
            return redirect()->route('login');
        }

        if (! (bool) AdminSetting::get('believe_points_enabled', true)) {
            return redirect()->route('believe-points.index')
                ->with('error', 'Believe Points purchases are currently disabled.');
        }

        try {
            $user->createOrGetStripeCustomer();
            $user->refresh();

            if (! $user->stripe_id) {
                return redirect()->route('believe-points.index')
                    ->with('error', 'Could not create a Stripe billing profile. Please try again or contact support.');
            }

            $currency = strtolower((string) config('cashier.currency', 'usd'));

            // Cashier pins Stripe API 2023-10-16: Checkout Session rejects setup_intent_data[usage]
            // ("unknown parameter"). Omit setup_intent_data; default SetupIntent behavior still allows saving a card.
            $session = Cashier::stripe()->checkout->sessions->create([
                'customer' => $user->stripe_id,
                'mode' => 'setup',
                'currency' => $currency,
                'payment_method_types' => ['card'],
                'success_url' => route('believe-points.auto-replenish.setup-success').'?session_id={CHECKOUT_SESSION_ID}',
                'cancel_url' => route('believe-points.index'),
                'metadata' => [
                    'user_id' => (string) $user->id,
                    'type' => 'believe_points_auto_replenish_setup',
                ],
            ]);

            return Inertia::location($session->url);
        } catch (ApiErrorException $e) {
            Log::error('Believe Points auto-replenish setup Stripe error', [
                'user_id' => $user->id,
                'message' => $e->getMessage(),
                'code' => $e->getStripeCode(),
                'request_id' => $e->getRequestId(),
            ]);

            $hint = config('app.debug')
                ? ' '.$e->getMessage()
                : '';

            return redirect()->route('believe-points.index')
                ->with('error', 'Could not start card setup.'.$hint.' Please try again or contact support.');
        } catch (\Throwable $e) {
            Log::error('Believe Points auto-replenish setup session error', [
                'user_id' => $user->id ?? null,
                'message' => $e->getMessage(),
                'exception' => $e::class,
            ]);

            $hint = config('app.debug') ? ' '.$e->getMessage() : '';

            return redirect()->route('believe-points.index')
                ->with('error', 'Could not start card setup.'.$hint.' Please try again.');
        }
    }

    public function autoReplenishSetupSuccess(Request $request): RedirectResponse
    {
        $user = Auth::user();
        if (! $user) {
            return redirect()->route('login');
        }

        $sessionId = $request->query('session_id');
        if (! $sessionId) {
            return redirect()->route('believe-points.index')
                ->with('error', 'Invalid setup session.');
        }

        try {
            $session = Cashier::stripe()->checkout->sessions->retrieve((string) $sessionId);
            if (($session->metadata->type ?? '') !== 'believe_points_auto_replenish_setup'
                || (int) ($session->metadata->user_id ?? 0) !== (int) $user->id) {
                return redirect()->route('believe-points.index')
                    ->with('error', 'This setup session does not match your account.');
            }

            $setupIntentId = $session->setup_intent;
            if (! $setupIntentId) {
                return redirect()->route('believe-points.index')
                    ->with('error', 'Could not confirm your card. Please try again.');
            }

            $setupIntent = Cashier::stripe()->setupIntents->retrieve(
                is_string($setupIntentId) ? $setupIntentId : $setupIntentId->id
            );
            $pmId = is_string($setupIntent->payment_method)
                ? $setupIntent->payment_method
                : ($setupIntent->payment_method->id ?? null);
            if (! $pmId) {
                return redirect()->route('believe-points.index')
                    ->with('error', 'No payment method was saved.');
            }

            BelievePointsPaymentMethodSyncService::ensurePaymentMethodBelongsToCustomer($user, $pmId);
            $pm = Cashier::stripe()->paymentMethods->retrieve($pmId);
            $card = $pm->card ?? null;

            $user->update([
                'believe_points_auto_replenish_pm_id' => $pmId,
                'believe_points_auto_replenish_card_brand' => $card->brand ?? null,
                'believe_points_auto_replenish_card_last4' => $card->last4 ?? null,
            ]);

            $user->refresh();
            if ($user->believe_points_auto_replenish_enabled) {
                Bus::dispatchSync(new ProcessBelievePointsAutoReplenishJob($user->id));
            }

            return redirect()->route('believe-points.index')
                ->with('success', 'Card saved. Turn on auto top-up and set your threshold and amount.');
        } catch (\Exception $e) {
            Log::error('Believe Points auto-replenish setup success error: '.$e->getMessage());

            return redirect()->route('believe-points.index')
                ->with('error', 'Could not save your card. Please try again.');
        }
    }

    public function autoReplenishRemovePaymentMethod(Request $request): RedirectResponse
    {
        $user = Auth::user();
        if (! $user) {
            return redirect()->route('login');
        }

        $user->update([
            'believe_points_auto_replenish_enabled' => false,
            'believe_points_auto_replenish_pm_id' => null,
            'believe_points_auto_replenish_card_brand' => null,
            'believe_points_auto_replenish_card_last4' => null,
        ]);

        return redirect()->route('believe-points.index')
            ->with('success', 'Saved card removed and auto top-up turned off.');
    }
}
