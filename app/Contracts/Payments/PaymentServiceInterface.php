<?php

namespace App\Contracts\Payments;

use App\Models\Donation;
use App\Models\Organization;
use App\Models\PaymentTransaction;
use App\Models\User;
use Symfony\Component\HttpFoundation\Response;

interface PaymentServiceInterface
{
    /**
     * Initiate payment for a donation. Returns redirect URL, Inertia location, or JSON payload.
     *
     * @param  array<string, mixed>  $context
     */
    public function initiateDonation(
        User $user,
        Organization $organization,
        Donation $donation,
        PaymentTransaction $paymentTransaction,
        array $context = []
    ): Response|array;

    public function supports(string $paymentMethod): bool;
}
