<?php

namespace App\Services\Payments;

use App\Enums\DonationPaymentMethod;
use App\Enums\PaymentTransactionType;
use App\Models\BelievePointPurchase;
use App\Models\PaymentMethod;
use App\Models\PaymentTransaction;
use App\Models\User;
use App\Services\BelievePointPurchaseSettlementService;
use App\Services\BelievePointsPurchaseCalculationService;
use App\Services\StripeEnvironmentSyncService;
use App\Support\PayPalClientBuilder;
use App\Support\PayPalReturnUrl;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Laravel\Cashier\Cashier;
use Symfony\Component\HttpFoundation\Response;

class BelievePointsPurchasePaymentService
{
    /**
     * @param  array<string, mixed>  $validated
     */
    public function initiate(
        User $user,
        array $validated,
        string $paymentMethod
    ): Response|RedirectResponse {
        BelievePointsPaymentMethodResolver::assertMethodAllowed($paymentMethod);

        $method = DonationPaymentMethod::tryFromInput($paymentMethod);
        if (! $method) {
            abort(422, 'Unsupported payment method.');
        }

        if ($method->isManual()) {
            return $this->initiateManual($user, $validated, $paymentMethod);
        }

        if ($method === DonationPaymentMethod::PayPal) {
            return $this->initiatePayPal($user, $validated);
        }

        if ($method->isStripeRail()) {
            return $this->initiateStripeCheckout($user, $validated, $method);
        }

        abort(422, 'Unsupported payment method.');
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function initiateManual(User $user, array $validated, string $paymentMethod): RedirectResponse
    {
        $netPointsUsd = round((float) $validated['amount'], 2);
        $points = $netPointsUsd;
        $breakdown = BelievePointsPurchaseCalculationService::checkoutBreakdown($netPointsUsd, 'card', $user);

        $purchase = BelievePointPurchase::create([
            'user_id' => $user->id,
            'amount' => $netPointsUsd,
            'checkout_total' => $breakdown['checkout_total_usd'],
            'processing_fee_estimate' => $breakdown['processing_fee_usd'],
            'platform_fee' => $breakdown['platform_fee_usd'],
            'points' => $points,
            'status' => 'pending',
            'source' => 'manual',
            'payment_method' => $paymentMethod,
        ]);

        PaymentTransaction::create([
            'user_id' => $user->id,
            'transaction_type' => PaymentTransactionType::BelievePointsPurchase->value,
            'payable_type' => BelievePointPurchase::class,
            'payable_id' => $purchase->id,
            'payment_method' => $paymentMethod,
            'amount' => $netPointsUsd,
            'status' => PaymentTransaction::STATUS_PENDING,
            'metadata' => [
                'manual_instructions' => BelievePointsPaymentMethodResolver::manualPaymentInstructions($paymentMethod),
            ],
        ]);

        return redirect()->route('believe-points.manual.confirm', ['purchase' => $purchase->id])
            ->with('success', 'Review payment instructions and confirm when complete.');
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function initiatePayPal(User $user, array $validated): Response|RedirectResponse
    {
        $paypalConfig = PaymentMethod::getConfig('paypal');
        if (! $paypalConfig || ! filled($paypalConfig->client_id) || ! filled($paypalConfig->client_secret)) {
            return redirect()->back()->with('error', 'PayPal is not configured. Please contact support.');
        }

        $netPointsUsd = round((float) $validated['amount'], 2);
        $points = $netPointsUsd;
        $breakdown = BelievePointsPurchaseCalculationService::checkoutBreakdown($netPointsUsd, 'card', $user);

        $purchase = BelievePointPurchase::create([
            'user_id' => $user->id,
            'amount' => $netPointsUsd,
            'checkout_total' => $breakdown['checkout_total_usd'],
            'processing_fee_estimate' => $breakdown['processing_fee_usd'],
            'platform_fee' => $breakdown['platform_fee_usd'],
            'points' => $points,
            'status' => 'pending',
            'source' => 'manual',
            'payment_method' => 'paypal',
        ]);

        $paymentTransaction = PaymentTransaction::create([
            'user_id' => $user->id,
            'transaction_type' => PaymentTransactionType::BelievePointsPurchase->value,
            'payable_type' => BelievePointPurchase::class,
            'payable_id' => $purchase->id,
            'payment_method' => 'paypal',
            'amount' => $netPointsUsd,
            'status' => PaymentTransaction::STATUS_PROCESSING,
        ]);

        $provider = PayPalClientBuilder::make($paypalConfig);
        $order = $provider->createOrder([
            'intent' => 'CAPTURE',
            'purchase_units' => [[
                'reference_id' => 'believe_points_'.$purchase->id,
                'description' => 'Purchase '.$points.' Believe Points',
                'amount' => [
                    'currency_code' => 'USD',
                    'value' => number_format($breakdown['checkout_total_usd'], 2, '.', ''),
                ],
                'custom_id' => (string) $purchase->id,
            ]],
            'application_context' => [
                'brand_name' => config('app.name', 'Believe In Unity'),
                'return_url' => PayPalReturnUrl::absolute('believe-points.paypal.capture', ['purchase' => $purchase->id]),
                'cancel_url' => PayPalReturnUrl::absolute('believe-points.index'),
                'user_action' => 'PAY_NOW',
            ],
        ]);

        if (isset($order['error']) || (isset($order['name']) && ! isset($order['id']))) {
            Log::error('PayPal order creation failed for Believe Points', [
                'response' => $order,
                'purchase_id' => $purchase->id,
            ]);
            $purchase->update(['status' => 'failed', 'failure_message' => 'PayPal order creation failed.']);

            return redirect()->back()->with('error', 'Could not create PayPal order. Please try again.');
        }

        $orderId = $order['id'] ?? null;
        if (! $orderId) {
            Log::error('PayPal order creation failed for Believe Points', [
                'response' => $order,
                'purchase_id' => $purchase->id,
            ]);
            $purchase->update(['status' => 'failed', 'failure_message' => 'PayPal order creation failed.']);

            return redirect()->back()->with('error', 'Could not create PayPal order. Please try again.');
        }

        $paymentTransaction->update([
            'external_reference' => $orderId,
            'metadata' => ['paypal_order_id' => $orderId],
        ]);

        $approveUrl = collect($order['links'] ?? [])->firstWhere('rel', 'approve')['href'] ?? null;
        if (! $approveUrl) {
            return redirect()->back()->with('error', 'PayPal approval URL missing.');
        }

        return Inertia::location($approveUrl);
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function initiateStripeCheckout(
        User $user,
        array $validated,
        DonationPaymentMethod $method
    ): Response|RedirectResponse {
        $feeRail = match ($method) {
            DonationPaymentMethod::StripeAch => 'bank',
            default => 'card',
        };

        $netPointsUsd = round((float) $validated['amount'], 2);
        $points = $netPointsUsd;
        $breakdown = BelievePointsPurchaseCalculationService::checkoutBreakdown($netPointsUsd, $feeRail, $user);
        $checkoutTotalUsd = $breakdown['checkout_total_usd'];
        $processingFeeAddon = $breakdown['processing_fee_usd'];
        $platformFee = $breakdown['platform_fee_usd'];

        if (! StripeEnvironmentSyncService::ensureUserStripeCustomer($user)) {
            return redirect()->back()
                ->withInput()
                ->with('error', 'Could not prepare your billing profile. Please try again.');
        }
        $user->refresh();

        $purchase = BelievePointPurchase::create([
            'user_id' => $user->id,
            'amount' => $netPointsUsd,
            'checkout_total' => $checkoutTotalUsd,
            'processing_fee_estimate' => $processingFeeAddon,
            'platform_fee' => $platformFee,
            'points' => $points,
            'status' => 'pending',
            'source' => 'manual',
            'payment_rail' => $feeRail,
            'payment_method' => $method->value,
        ]);

        $amountInCents = (int) round($checkoutTotalUsd * 100);
        $paymentMethodTypes = $method->stripePaymentMethodTypes();

        $checkoutOptions = [
            'success_url' => route('believe-points.success').'?session_id={CHECKOUT_SESSION_ID}',
            'cancel_url' => route('believe-points.cancel').'?session_id={CHECKOUT_SESSION_ID}',
            'metadata' => [
                'purchase_id' => (string) $purchase->id,
                'user_id' => (string) $user->id,
                'type' => 'believe_points_purchase',
                'payment_rail' => $feeRail,
                'payment_method' => $method->value,
                'base_points_usd' => (string) $netPointsUsd,
                'checkout_total_usd' => (string) $checkoutTotalUsd,
            ],
            'payment_method_types' => $paymentMethodTypes,
            'billing_address_collection' => 'auto',
            'payment_intent_data' => [
                'metadata' => [
                    'purchase_id' => (string) $purchase->id,
                    'user_id' => (string) $user->id,
                    'type' => 'believe_points_purchase',
                    'base_points_usd' => (string) $netPointsUsd,
                    'checkout_total_usd' => (string) $checkoutTotalUsd,
                ],
            ],
        ];

        $checkout = $user->checkoutCharge(
            $amountInCents,
            "Purchase {$points} Believe Points (incl. est. processing)",
            1,
            $checkoutOptions
        );

        $purchase->update(['stripe_session_id' => $checkout->id]);

        return Inertia::location($checkout->url);
    }

    public function capturePayPalOrder(BelievePointPurchase $purchase, ?string $orderIdFromRequest): bool
    {
        if ($purchase->status === 'completed') {
            return true;
        }

        $paymentTx = PaymentTransaction::query()
            ->where('payable_type', BelievePointPurchase::class)
            ->where('payable_id', $purchase->id)
            ->first();

        $orderId = filled($orderIdFromRequest)
            ? $orderIdFromRequest
            : ($paymentTx?->external_reference ?: ($paymentTx?->metadata['paypal_order_id'] ?? null));

        if (! filled($orderId)) {
            Log::warning('PayPal capture missing order id for Believe Points', [
                'purchase_id' => $purchase->id,
            ]);

            return false;
        }

        $paypalConfig = PaymentMethod::getConfig('paypal');
        if (! $paypalConfig) {
            return false;
        }

        $provider = PayPalClientBuilder::make($paypalConfig);
        $capture = $provider->capturePaymentOrder($orderId);

        if (! $this->paypalCaptureSucceeded($capture)) {
            Log::warning('PayPal capture not completed for Believe Points', [
                'purchase_id' => $purchase->id,
                'order_id' => $orderId,
                'response' => $capture,
            ]);

            return false;
        }

        $captureId = $capture['purchase_units'][0]['payments']['captures'][0]['id'] ?? $orderId;

        return BelievePointPurchaseSettlementService::settleManualPurchase(
            $purchase->id,
            'paypal_'.$captureId,
            'paypal'
        );
    }

    /**
     * @param  array<string, mixed>  $capture
     */
    private function paypalCaptureSucceeded(array $capture): bool
    {
        if (isset($capture['error']) || (isset($capture['name']) && ! isset($capture['status']))) {
            return false;
        }

        if (strtoupper((string) ($capture['status'] ?? '')) === 'COMPLETED') {
            return true;
        }

        $unitCaptureStatus = $capture['purchase_units'][0]['payments']['captures'][0]['status'] ?? null;

        return strtoupper((string) $unitCaptureStatus) === 'COMPLETED';
    }

    public function confirmManualPayment(
        BelievePointPurchase $purchase,
        User $user,
        ?string $receiptPath = null
    ): RedirectResponse {
        if ((int) $purchase->user_id !== (int) $user->id) {
            abort(403);
        }

        if ($purchase->status !== 'pending') {
            return redirect()->route('believe-points.index')
                ->with('warning', 'This purchase has already been processed.');
        }

        $updates = [];
        if ($receiptPath) {
            $updates['receipt_image'] = $receiptPath;
        }
        if ($updates !== []) {
            $purchase->update($updates);
        }

        $paymentTx = PaymentTransaction::query()
            ->where('payable_type', BelievePointPurchase::class)
            ->where('payable_id', $purchase->id)
            ->first();

        if ($paymentTx) {
            $txUpdates = ['status' => PaymentTransaction::STATUS_PENDING];
            if ($receiptPath) {
                $txUpdates['receipt_image'] = $receiptPath;
            }
            $paymentTx->update($txUpdates);
        }

        return redirect()->route('believe-points.index')->with(
            'success',
            'Payment confirmation received. An admin will verify your payment and credit your Believe Points.'
        );
    }
}
