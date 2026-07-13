<?php

namespace App\Services;

use App\Models\Donation;
use App\Models\Organization;
use App\Models\User;
use Laravel\Cashier\Cashier;

/**
 * Stripe Connect checkout for donations to organizations.
 *
 * Uses the **destination charge** pattern so the BIU platform Stripe account collects the
 * processing-fee portion as `application_fee_amount`, and the remaining amount is transferred
 * to the organization's connected Standard account via `transfer_data.destination`.
 *
 * `on_behalf_of` keeps the receipt, statement descriptor, and risk profile attached to the
 * connected nonprofit so the donor still sees the organization as the merchant.
 *
 * Net effect:
 *  - Donor pays {@see $checkoutTotalInCents} (gift + donor-covered processing fee, when toggled).
 *  - BIU receives {@see $applicationFeeInCents} on its platform balance.
 *  - Organization receives ({$checkoutTotalInCents} − {$applicationFeeInCents}) on its connected balance.
 *  - Stripe processing fees are paid out of BIU's platform balance.
 */
final class DonationStripeConnectCheckoutSessionService
{
    /**
     * @param  array<string, string|int|float|null>  $metadata
     * @param  non-empty-array<int, mixed>  $paymentMethodTypes
     */
    public static function create(
        User $user,
        Organization $organization,
        Donation $donation,
        int $checkoutTotalInCents,
        int $applicationFeeInCents,
        string $lineItemTitle,
        array $metadata,
        array $paymentMethodTypes,
        string $successUrl,
        string $cancelUrl,
        ?string $paymentIntentDescription = null,
        ?string $statementDescriptorSuffix = null
    ): object {
        if ($organization->stripe_connect_account_id === null || $organization->stripe_connect_account_id === '') {
            throw new \InvalidArgumentException('Organization has no Stripe Connect account.');
        }
        if (StripeConnectOrganizationService::isLegacyExpressAccount($organization)) {
            throw new \InvalidArgumentException(
                'Legacy Express Stripe accounts are not supported for donations. The organization must reconnect with a Standard Stripe account.'
            );
        }
        if ($checkoutTotalInCents <= 0) {
            throw new \InvalidArgumentException('Checkout amount must be positive.');
        }

        // Stripe rejects an application_fee that meets or exceeds the charge amount or is negative.
        $applicationFeeInCents = max(0, min($applicationFeeInCents, $checkoutTotalInCents - 1));

        StripeConnectOrganizationService::configureStripe();

        $meta = array_merge($metadata, [
            'donation_id' => (string) $donation->id,
            'stripe_connect_destination' => (string) $organization->stripe_connect_account_id,
            'stripe_application_fee_cents' => (string) $applicationFeeInCents,
            'platform_routing_mode' => 'destination_charge',
        ]);

        $paymentIntentData = [
            'metadata' => $meta,
            'transfer_data' => [
                'destination' => $organization->stripe_connect_account_id,
            ],
            'on_behalf_of' => $organization->stripe_connect_account_id,
        ];
        if ($applicationFeeInCents > 0) {
            $paymentIntentData['application_fee_amount'] = $applicationFeeInCents;
        }
        if ($paymentIntentDescription !== null && trim($paymentIntentDescription) !== '') {
            $paymentIntentData['description'] = mb_substr(trim($paymentIntentDescription), 0, 1000);
        }
        if ($statementDescriptorSuffix !== null && trim($statementDescriptorSuffix) !== '') {
            $paymentIntentData['statement_descriptor_suffix'] = mb_substr(trim($statementDescriptorSuffix), 0, 22);
        }

        $payload = [
            'mode' => 'payment',
            'customer_email' => $user->email,
            'line_items' => [
                [
                    'price_data' => [
                        'currency' => 'usd',
                        'unit_amount' => $checkoutTotalInCents,
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
            'payment_intent_data' => $paymentIntentData,
            'locale' => 'auto',
        ];

        // Destination charge — session lives on the platform Stripe account, NOT on the connected
        // account. Do NOT pass a `stripe_account` request option here; otherwise the charge would
        // become a direct charge and the platform fee would be deducted from the connected balance.
        return Cashier::stripe()->checkout->sessions->create($payload);
    }
}
