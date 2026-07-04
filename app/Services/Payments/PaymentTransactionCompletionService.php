<?php

namespace App\Services\Payments;

use App\Enums\DonationPaymentMethod;
use App\Enums\PaymentTransactionType;
use App\Models\Donation;
use App\Models\PaymentTransaction;
use App\Models\User;
use App\Services\DonationStripePaymentCompletion;
use App\Services\ImpactScoreService;
use App\Services\ManualDonationNotifier;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Central completion handler — only webhooks or admin approval should call this.
 */
class PaymentTransactionCompletionService
{
    public static function completeDonation(
        Donation $donation,
        ?string $externalReference = null,
        ?string $paymentMethodOverride = null,
        ?int $verifiedByUserId = null,
        ?string $adminNotes = null
    ): bool {
        return (bool) DB::transaction(function () use ($donation, $externalReference, $paymentMethodOverride, $verifiedByUserId, $adminNotes) {
            $donation = Donation::lockForUpdate()->find($donation->id);
            if (! $donation) {
                return false;
            }

            if (in_array($donation->status, ['completed', 'active'], true)) {
                BelievePointsRewardService::issueDonationReward($donation->fresh());

                return true;
            }

            $updates = [
                'status' => 'completed',
                'donation_date' => now(),
            ];

            if ($externalReference) {
                $updates['transaction_id'] = $externalReference;
            }

            if ($paymentMethodOverride) {
                $updates['payment_method'] = $paymentMethodOverride;
            }

            $donation->update($updates);

            $paymentTx = $donation->payment_transaction_id
                ? PaymentTransaction::lockForUpdate()->find($donation->payment_transaction_id)
                : null;

            if ($paymentTx) {
                $txUpdates = [
                    'status' => PaymentTransaction::STATUS_COMPLETED,
                    'completed_at' => now(),
                ];
                if ($externalReference) {
                    $txUpdates['external_reference'] = $externalReference;
                }
                if ($verifiedByUserId) {
                    $txUpdates['verified_by'] = $verifiedByUserId;
                    $txUpdates['verified_at'] = now();
                }
                if ($adminNotes) {
                    $txUpdates['admin_notes'] = $adminNotes;
                }
                $paymentTx->update($txUpdates);
            }

            DonationStripePaymentCompletion::applyDonationLedgerAndBalances($donation->fresh());
            app(ImpactScoreService::class)->awardDonationPoints($donation->fresh());
            BelievePointsRewardService::issueDonationReward($donation->fresh());

            Log::info('Donation payment completed', [
                'donation_id' => $donation->id,
                'payment_method' => $donation->payment_method,
                'external_reference' => $externalReference,
            ]);

            return true;
        });
    }

    public static function rejectManualDonation(
        Donation $donation,
        int $adminUserId,
        ?string $adminNotes = null
    ): bool {
        return (bool) DB::transaction(function () use ($donation, $adminUserId, $adminNotes) {
            $donation = Donation::lockForUpdate()->find($donation->id);
            if (! $donation || $donation->status !== 'pending') {
                return false;
            }

            $donation->update(['status' => 'rejected']);

            if ($donation->payment_transaction_id) {
                PaymentTransaction::where('id', $donation->payment_transaction_id)->update([
                    'status' => PaymentTransaction::STATUS_REJECTED,
                    'verified_by' => $adminUserId,
                    'verified_at' => now(),
                    'admin_notes' => $adminNotes,
                ]);
            }

            app(ManualDonationNotifier::class)->notifyRejected($donation->fresh(), $adminNotes);

            return true;
        });
    }

    public static function createForDonation(Donation $donation, string $paymentMethod): PaymentTransaction
    {
        $method = DonationPaymentMethod::tryFromInput($paymentMethod) ?? DonationPaymentMethod::StripeCard;

        $donor = $donation->user_id ? User::find($donation->user_id) : null;

        return PaymentTransaction::create([
            'user_id' => $donation->user_id,
            'organization_id' => $donation->organization_id,
            'transaction_type' => PaymentTransactionType::Donation->value,
            'payable_type' => Donation::class,
            'payable_id' => $donation->id,
            'payment_method' => $method->value,
            'amount' => $donation->amount,
            'status' => $method->isManual() ? PaymentTransaction::STATUS_PENDING : PaymentTransaction::STATUS_PROCESSING,
            'reward_points' => BelievePointsRewardService::donationBrpAmountForUser($donor),
            'metadata' => [
                'frequency' => $donation->frequency,
                'care_alliance_id' => $donation->care_alliance_id,
            ],
        ]);
    }
}
