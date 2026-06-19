<?php

namespace App\Http\Controllers;

use App\Models\Donation;
use App\Models\PaymentMethod;
use App\Models\PaymentTransaction;
use App\Services\Payments\PayPalDonationPaymentService;
use App\Services\Payments\PaymentTransactionCompletionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PayPalWebhookController extends Controller
{
    public function handle(Request $request, PayPalDonationPaymentService $paypalService): \Illuminate\Http\Response
    {
        $payload = $request->all();
        $eventType = $payload['event_type'] ?? '';

        Log::info('PayPal webhook received', ['event_type' => $eventType]);

        if ($eventType === 'PAYMENT.CAPTURE.COMPLETED') {
            $resource = $payload['resource'] ?? [];
            $customId = $resource['custom_id'] ?? null;
            $captureId = $resource['id'] ?? null;

            if ($customId && $captureId) {
                $donation = Donation::query()->find((int) $customId);
                if ($donation && $donation->status === 'pending') {
                    PaymentTransactionCompletionService::completeDonation(
                        $donation,
                        'paypal_'.$captureId,
                        'paypal'
                    );
                }
            }
        }

        return response('OK', 200);
    }
}
