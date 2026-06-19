<?php

namespace App\Services\Payments;

use App\Contracts\Payments\PaymentServiceInterface;
use App\Models\Donation;
use App\Models\Organization;
use App\Models\PaymentTransaction;
use App\Models\User;
use Symfony\Component\HttpFoundation\Response;

class PaymentOrchestratorService
{
    /** @var array<int, PaymentServiceInterface> */
    private array $services;

    public function __construct(
        StripeDonationPaymentService $stripe,
        PayPalDonationPaymentService $paypal,
        ManualDonationPaymentService $manual,
        BelievePointsDonationPaymentService $believePoints,
    ) {
        $this->services = [$stripe, $paypal, $manual, $believePoints];
    }

    /**
     * @param  array<string, mixed>  $context
     */
    public function initiateDonation(
        User $user,
        Organization $organization,
        Donation $donation,
        string $paymentMethod,
        array $context = []
    ): Response|array {
        OrganizationPaymentMethodResolver::assertMethodAllowed($organization, $paymentMethod);

        $paymentTransaction = PaymentTransactionCompletionService::createForDonation($donation, $paymentMethod);
        $donation->update(['payment_transaction_id' => $paymentTransaction->id]);

        $context['payment_method'] = $paymentMethod;

        foreach ($this->services as $service) {
            if ($service->supports($paymentMethod)) {
                return $service->initiateDonation(
                    $user,
                    $organization,
                    $donation,
                    $paymentTransaction,
                    $context
                );
            }
        }

        abort(422, 'Unsupported payment method.');
    }
}
