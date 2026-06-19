<?php

namespace App\Services\Payments;

use App\Contracts\Payments\PaymentServiceInterface;
use App\Models\Donation;
use App\Models\Organization;
use App\Models\PaymentMethod;
use App\Models\PaymentTransaction;
use App\Models\User;
use App\Support\PayPalClientBuilder;
use App\Support\PayPalReturnUrl;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class PayPalDonationPaymentService implements PaymentServiceInterface
{
    public function supports(string $paymentMethod): bool
    {
        return $paymentMethod === 'paypal';
    }

    /**
     * @param  array<string, mixed>  $context
     */
    public function initiateDonation(
        User $user,
        Organization $organization,
        Donation $donation,
        PaymentTransaction $paymentTransaction,
        array $context = []
    ): Response|array {
        $paypalConfig = PaymentMethod::getConfig('paypal');
        if (! $paypalConfig || ! filled($paypalConfig->client_id) || ! filled($paypalConfig->client_secret)) {
            return redirect()->back()->withErrors([
                'payment_method' => 'PayPal is not configured. Please contact support.',
            ]);
        }

        $amount = round((float) $donation->amount, 2);
        $provider = PayPalClientBuilder::make($paypalConfig);

        $order = $provider->createOrder([
            'intent' => 'CAPTURE',
            'purchase_units' => [[
                'reference_id' => 'donation_'.$donation->id,
                'description' => 'Donation to '.$organization->name,
                'amount' => [
                    'currency_code' => 'USD',
                    'value' => number_format($amount, 2, '.', ''),
                ],
                'custom_id' => (string) $donation->id,
            ]],
            'application_context' => [
                'brand_name' => config('app.name', 'Believe In Unity'),
                'return_url' => PayPalReturnUrl::absolute('donations.paypal.capture', ['donation' => $donation->id]),
                'cancel_url' => PayPalReturnUrl::absolute('donations.cancel').'?donation_id='.$donation->id,
                'user_action' => 'PAY_NOW',
            ],
        ]);

        $orderId = $order['id'] ?? null;
        if (! $orderId) {
            Log::error('PayPal order creation failed', ['response' => $order, 'donation_id' => $donation->id]);

            return redirect()->back()->withErrors([
                'payment_method' => 'Could not create PayPal order. Please try again.',
            ]);
        }

        $donation->update([
            'payment_method' => 'paypal',
            'transaction_id' => 'paypal_order_'.$orderId,
        ]);

        $paymentTransaction->update([
            'payment_method' => 'paypal',
            'external_reference' => $orderId,
            'status' => PaymentTransaction::STATUS_PROCESSING,
            'metadata' => array_merge($paymentTransaction->metadata ?? [], [
                'paypal_order_id' => $orderId,
            ]),
        ]);

        $approveUrl = collect($order['links'] ?? [])->firstWhere('rel', 'approve')['href'] ?? null;
        if (! $approveUrl) {
            return redirect()->back()->withErrors([
                'payment_method' => 'PayPal approval URL missing.',
            ]);
        }

        return Inertia::location($approveUrl);
    }

    public function captureOrder(Donation $donation, string $orderId): bool
    {
        $paypalConfig = PaymentMethod::getConfig('paypal');
        if (! $paypalConfig) {
            return false;
        }

        $provider = PayPalClientBuilder::make($paypalConfig);
        $capture = $provider->capturePaymentOrder($orderId);
        $status = $capture['status'] ?? '';

        if ($status !== 'COMPLETED') {
            Log::warning('PayPal capture not completed', [
                'donation_id' => $donation->id,
                'order_id' => $orderId,
                'status' => $status,
            ]);

            return false;
        }

        $captureId = $capture['purchase_units'][0]['payments']['captures'][0]['id'] ?? $orderId;

        return PaymentTransactionCompletionService::completeDonation(
            $donation,
            'paypal_'.$captureId,
            'paypal'
        );
    }

}
