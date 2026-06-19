<?php

namespace App\Services\Payments;

use App\Contracts\Payments\PaymentServiceInterface;
use App\Enums\DonationPaymentMethod;
use App\Models\Donation;
use App\Models\Organization;
use App\Models\PaymentTransaction;
use App\Models\User;
use App\Services\DonationStripeConnectCheckoutSessionService;
use App\Services\DonationStripeConnectRouting;
use App\Services\DonationStripeDescriptionBuilder;
use App\Services\DonationProcessingFeeEstimator;
use App\Services\StripeConnectOrganizationService;
use App\Services\StripeEnvironmentSyncService;
use App\Services\StripeProcessingFeeEstimator;
use App\Support\StripeCustomerChargeAmount;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Laravel\Cashier\Cashier;
use Symfony\Component\HttpFoundation\Response;

class StripeDonationPaymentService implements PaymentServiceInterface
{
    public function supports(string $paymentMethod): bool
    {
        $enum = DonationPaymentMethod::tryFromInput($paymentMethod);

        return $enum?->isStripeRail() ?? false;
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
        $method = DonationPaymentMethod::tryFromInput($context['payment_method'] ?? $donation->payment_method)
            ?? DonationPaymentMethod::StripeCard;

        $feeRail = $context['donation_fee_rail'] ?? 'card';
        if ($method === DonationPaymentMethod::StripeAch) {
            $feeRail = 'bank';
        }

        $baseGiftUsd = (float) $donation->amount;
        $donorCoversFees = (bool) ($context['donor_covers_processing_fees'] ?? false);
        $allianceForCheckout = $context['alliance'] ?? null;

        $checkoutTotalUsd = $baseGiftUsd;
        $processingFeeEstimate = null;

        if ($donorCoversFees) {
            if ($feeRail === 'bank') {
                $checkoutTotalUsd = DonationProcessingFeeEstimator::grossUpAchChargeUsdForNetGiftUsd($baseGiftUsd);
                $processingFeeEstimate = DonationProcessingFeeEstimator::feeAddonWhenDonorCoversAchUsd($baseGiftUsd);
            } else {
                $checkoutTotalUsd = DonationProcessingFeeEstimator::grossUpCardChargeUsdForNetGiftUsd($baseGiftUsd);
                $processingFeeEstimate = DonationProcessingFeeEstimator::feeAddonWhenDonorCoversUsd($baseGiftUsd);
            }
        } else {
            $checkoutTotalUsd = $baseGiftUsd;
            $processingFeeEstimate = $feeRail === 'bank'
                ? DonationProcessingFeeEstimator::estimateAchFeeOnChargeUsd($baseGiftUsd)
                : DonationProcessingFeeEstimator::estimateCardFeeOnChargeUsd($baseGiftUsd);
        }

        if (! $donorCoversFees && StripeProcessingFeeEstimator::customerPaysProcessingFeeEnabled()) {
            $rail = $feeRail === 'bank' ? 'us_bank_account' : 'card';
            $amountInCents = StripeCustomerChargeAmount::chargeCentsFromNetUsd($baseGiftUsd, $rail);
        } else {
            $amountInCents = (int) round($checkoutTotalUsd * 100);
        }

        $useStripeConnectCheckout = DonationStripeConnectRouting::shouldRouteThroughStripeConnect(
            $organization,
            $allianceForCheckout,
            $donation->frequency,
            'stripe'
        );

        $applicationFeeInCents = 0;
        if ($useStripeConnectCheckout && $processingFeeEstimate !== null && $processingFeeEstimate > 0) {
            $applicationFeeInCents = (int) round(((float) $processingFeeEstimate) * 100);
            $applicationFeeInCents = max(0, min($applicationFeeInCents, max(0, $amountInCents - 1)));
        }

        $donation->update([
            'checkout_total' => round($checkoutTotalUsd, 2),
            'processing_fee_estimate' => $processingFeeEstimate,
            'donor_covers_processing_fees' => $donorCoversFees,
            'stripe_connect_account_id' => $useStripeConnectCheckout ? $organization->stripe_connect_account_id : null,
            'stripe_application_fee_amount' => $useStripeConnectCheckout && $applicationFeeInCents > 0
                ? round($applicationFeeInCents / 100, 2)
                : null,
            'payment_method' => $method->value,
        ]);

        $paymentMethodTypes = $method->stripePaymentMethodTypes();
        if ($method === DonationPaymentMethod::StripeLegacy) {
            $paymentMethodTypes = $feeRail === 'bank' ? ['us_bank_account'] : ['card'];
        }

        $checkoutLineTitle = $allianceForCheckout !== null
            ? sprintf('Donation to %s', $allianceForCheckout->name)
            : "Donation to {$organization->name}";

        $metadata = array_merge($context['stripe_metadata'] ?? [], [
            'payment_transaction_id' => (string) $paymentTransaction->id,
        ]);

        $piDescription = DonationStripeDescriptionBuilder::forPaymentIntent(
            $organization,
            $allianceForCheckout,
            $user,
            $baseGiftUsd,
            $checkoutTotalUsd,
            $donorCoversFees,
            $processingFeeEstimate !== null ? (float) $processingFeeEstimate : null
        );

        $statementSuffix = DonationStripeDescriptionBuilder::forStatementDescriptorSuffix(
            $organization,
            $allianceForCheckout
        );

        $successUrl = route('donations.success').'?donation_id='.$donation->id.'&session_id={CHECKOUT_SESSION_ID}';
        $cancelUrl = route('donations.cancel').'?donation_id='.$donation->id.'&session_id={CHECKOUT_SESSION_ID}';

        if ($useStripeConnectCheckout) {
            $checkoutSession = DonationStripeConnectCheckoutSessionService::create(
                $user,
                $organization,
                $donation,
                $amountInCents,
                $applicationFeeInCents,
                mb_substr($checkoutLineTitle, 0, 250),
                $metadata,
                $paymentMethodTypes,
                $successUrl,
                $cancelUrl,
                $piDescription,
                $statementSuffix
            );
            $donation->update(['stripe_checkout_session_id' => $checkoutSession->id]);
            $paymentTransaction->update(['external_reference' => $checkoutSession->id]);

            return Inertia::location($checkoutSession->url);
        }

        if (! StripeEnvironmentSyncService::ensureUserStripeCustomer($user)) {
            $donation->update(['status' => 'failed']);
            Log::error('Stripe donation: could not prepare customer', ['user_id' => $user->id]);

            return redirect()->back()->withErrors([
                'message' => 'Payment setup failed. Please try again in a moment.',
            ]);
        }

        $user->refresh();

        $checkoutOptions = [
            'success_url' => $successUrl,
            'cancel_url' => $cancelUrl,
            'metadata' => $metadata,
            'payment_method_types' => $paymentMethodTypes,
            'billing_address_collection' => 'auto',
            'payment_intent_data' => [
                'description' => mb_substr($piDescription, 0, 1000),
                'statement_descriptor_suffix' => mb_substr($statementSuffix, 0, 22),
                'metadata' => $metadata,
            ],
        ];

        $checkout = $user->checkoutCharge(
            $amountInCents,
            mb_substr($checkoutLineTitle, 0, 250),
            1,
            $checkoutOptions,
            [],
            []
        );

        $paymentTransaction->update(['external_reference' => $checkout->id ?? null]);

        return Inertia::location($checkout->url);
    }
}
