<?php

namespace App\Services\Payments;

use App\Contracts\Payments\PaymentServiceInterface;
use App\Enums\DonationPaymentMethod;
use App\Models\Donation;
use App\Models\Organization;
use App\Models\PaymentTransaction;
use App\Models\User;
use App\Services\ManualDonationNotifier;
use Illuminate\Http\RedirectResponse;
use Symfony\Component\HttpFoundation\Response;

class ManualDonationPaymentService implements PaymentServiceInterface
{
    public function supports(string $paymentMethod): bool
    {
        $enum = DonationPaymentMethod::tryFromInput($paymentMethod);

        return $enum?->isManual() ?? false;
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
        $method = DonationPaymentMethod::tryFromInput($context['payment_method'] ?? $donation->payment_method);
        $donation->update(['payment_method' => $method->value]);

        $paymentTransaction->update([
            'payment_method' => $method->value,
            'status' => PaymentTransaction::STATUS_PENDING,
            'metadata' => array_merge($paymentTransaction->metadata ?? [], [
                'manual_instructions' => OrganizationPaymentMethodResolver::manualPaymentInstructions(
                    $organization,
                    $method->value
                ),
            ]),
        ]);

        return redirect()->route('donations.manual.confirm', [
            'donation' => $donation->id,
        ])->with('success', 'Review payment instructions and confirm when complete.');
    }

    public function confirmPayment(
        Donation $donation,
        User $user,
        ?string $receiptPath = null
    ): RedirectResponse {
        if ((int) $donation->user_id !== (int) $user->id) {
            abort(403);
        }

        if ($donation->status !== 'pending') {
            return redirect()->route('donate')->with('warning', 'This donation has already been processed.');
        }

        $updates = [];
        if ($receiptPath) {
            $updates['receipt_image'] = $receiptPath;
        }
        if ($updates !== []) {
            $donation->update($updates);
        }

        if ($donation->payment_transaction_id) {
            $txUpdates = ['status' => PaymentTransaction::STATUS_PENDING];
            if ($receiptPath) {
                $txUpdates['receipt_image'] = $receiptPath;
            }
            PaymentTransaction::where('id', $donation->payment_transaction_id)->update($txUpdates);
        }

        app(ManualDonationNotifier::class)->notifyPendingReview($donation->fresh());

        return redirect()->route('donate')->with(
            'success',
            'Payment confirmation received. The organization will verify your donation. You will be notified by email and push when it is approved.'
        );
    }
}
