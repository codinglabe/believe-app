<?php

namespace App\Services;

use App\Models\Donation;
use App\Models\Organization;
use App\Models\User;
use Laravel\Cashier\Cashier;

final class DonationStripeConnectCheckoutSessionService
{
    /**
     * Direct charge Checkout Session on the organization’s Stripe Connect Express account.
     *
     * @param  array<string, string|int|float|null>  $metadata
     * @param  non-empty-array<int, mixed>  $paymentMethodTypes
     */
    public static function create(
        User $user,
        Organization $organization,
        Donation $donation,
        int $amountInCents,
        string $lineItemTitle,
        array $metadata,
        array $paymentMethodTypes,
        string $successUrl,
        string $cancelUrl
    ): object {
        if ($organization->stripe_connect_account_id === null || $organization->stripe_connect_account_id === '') {
            throw new \InvalidArgumentException('Organization has no Stripe Connect account.');
        }

        StripeConnectOrganizationService::configureStripe();

        $meta = array_merge($metadata, [
            'donation_id' => (string) $donation->id,
            'stripe_connect_destination' => (string) $organization->stripe_connect_account_id,
        ]);

        $payload = [
            'mode' => 'payment',
            'customer_email' => $user->email,
            'line_items' => [
                [
                    'price_data' => [
                        'currency' => 'usd',
                        'unit_amount' => $amountInCents,
                        'product_data' => [
                            'name' => mb_substr($lineItemTitle, 0, 250),
                        ],
                    ],
                    'quantity' => 1,
                ],
            ],
            'payment_method_types' => $paymentMethodTypes,
            'billing_address_collection' => 'auto',
            'success_url' => $successUrl,
            'cancel_url' => $cancelUrl,
            'metadata' => $meta,
            'payment_intent_data' => [
                'metadata' => $meta,
            ],
            'locale' => 'auto',
        ];

        $stripe = Cashier::stripe();

        return $stripe->checkout->sessions->create($payload, [
            'stripe_account' => $organization->stripe_connect_account_id,
        ]);
    }
}
