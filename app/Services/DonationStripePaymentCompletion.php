<?php

namespace App\Services;

use App\Models\CareAlliance;
use App\Models\Donation;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

final class DonationStripePaymentCompletion
{
    /**
     * Idempotent settle for successful one-time Checkout that produced a PaymentIntent.
     *
     * @param  string|null  $paymentMethodStripeLabel  e.g. "card", "us_bank_account" or short label from gateway
     */
    public static function completeSuccessfulOneTime(
        Donation $donation,
        string $paymentIntentId,
        ?string $paymentMethodStripeLabel
    ): void {
        $donation->loadMissing(['organization']);

        $alreadySettled = $donation->status === 'completed'
            && (string) $donation->transaction_id === $paymentIntentId;
        if ($alreadySettled) {
            return;
        }

        $label = self::sanitizePaymentLabel($paymentMethodStripeLabel ?? 'stripe');

        DB::transaction(function () use ($donation, $paymentIntentId, $label) {
            $donation->update([
                'transaction_id' => $paymentIntentId,
                'payment_method' => $label,
                'status' => 'completed',
                'donation_date' => now(),
            ]);
            /** @see DonationController::applyDonationToBalances */
            self::applyDonationLedgerAndBalances(Donation::query()->findOrFail($donation->id));
        });

        app(ImpactScoreService::class)->awardDonationPoints($donation->fresh());
    }

    /**
     * @see DonationController::applyDonationToBalances — kept in sync for Stripe Connect semantics.
     */
    public static function applyDonationLedgerAndBalances(Donation $donation): void
    {
        if (($donation->stripe_connect_account_id ?? null) !== null && ($donation->stripe_connect_account_id ?? '') !== '') {
            DonationLedgerSyncService::recordRecipientDepositIfMissing($donation, false);

            return;
        }

        $donation->loadMissing('organization.user');
        if ($donation->care_alliance_id) {
            $alliance = CareAlliance::query()->find($donation->care_alliance_id);
            if ($alliance && $alliance->financial_settings_completed_at) {
                $amountCents = (int) round((float) $donation->amount * 100);
                $svc = app(CareAllianceGeneralDonationDistributionService::class);
                $dist = $svc->computeDistribution($alliance, $amountCents);
                if (CareAllianceGeneralDonationDistributionService::distributionIsScheduled($alliance->distribution_frequency)) {
                    $svc->accumulatePendingDistribution($alliance, $dist['org_shares'], $dist['fee_cents']);
                } else {
                    $svc->distributeCompletedDonation($donation, $alliance, $dist['org_shares'], $dist['fee_cents']);
                }

                return;
            }
        }
        if ($donation->organization && $donation->organization->user) {
            DonationLedgerSyncService::recordRecipientDepositIfMissing($donation, true);

            Log::info('Donation added to organization user balance', [
                'donation_id' => $donation->id,
                'organization_id' => $donation->organization->id,
                'amount' => $donation->amount,
            ]);
        }
    }

    private static function sanitizePaymentLabel(string $label): string
    {
        $trim = strtolower(trim($label));
        $trim = str_replace('-', '_', $trim);

        return $trim === '' ? 'stripe' : $trim;
    }
}
