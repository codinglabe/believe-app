<?php

namespace App\Services;

use App\Models\CareAlliance;
use App\Models\Donation;
use App\Models\Transaction;

/**
 * Links Believe {@see Donation} records to wallet {@see Transaction} rows (ledger).
 * The ledger is not the donations table: one donation can produce 0, 1, or many transactions
 * (donor audit, recipient deposit, Care Alliance splits, scheduled pool with no wallet rows yet).
 */
class DonationLedgerSyncService
{
    /**
     * True if any ledger row references this donation (polymorphic, meta donation_id, split lines,
     * or same Stripe payment ref as {@see Donation::$transaction_id} on older rows).
     */
    public static function donationHasLedgerReference(int $donationId): bool
    {
        $linked = Transaction::query()
            ->where(function ($q) use ($donationId) {
                $q->where(function ($q2) use ($donationId) {
                    $q2->where('related_type', Donation::class)->where('related_id', $donationId);
                })
                    ->orWhere('meta->donation_id', $donationId)
                    ->orWhere('meta->donation_id', (string) $donationId);
            })
            ->exists();

        if ($linked) {
            return true;
        }

        $donation = Donation::query()->find($donationId);
        if (! $donation || $donation->transaction_id === null || $donation->transaction_id === '') {
            return false;
        }

        $ref = (string) $donation->transaction_id;

        return Transaction::query()
            ->where(function ($q) use ($ref) {
                $q->where('transaction_id', $ref)
                    ->orWhere('meta->stripe_payment_intent', $ref)
                    ->orWhere('meta->stripe_payment_intent_id', $ref)
                    ->orWhere('meta->payment_intent', $ref);
            })
            ->exists();
    }

    /**
     * Donor-side audit row (does not change wallet balance). Idempotent.
     */
    public static function recordDonorAuditIfMissing(Donation $donation): void
    {
        $donation->loadMissing('user', 'organization');
        if (! $donation->user) {
            return;
        }

        $exists = Transaction::query()
            ->where('user_id', $donation->user_id)
            ->where('related_type', Donation::class)
            ->where('related_id', $donation->id)
            ->where('meta->ledger_role', 'donor_payment')
            ->exists();
        if ($exists) {
            return;
        }

        $amountDollars = (float) $donation->amount;
        $meta = [
            'donation_id' => $donation->id,
            'organization_id' => $donation->organization_id,
            'ledger_role' => 'donor_payment',
            'source' => 'donation_checkout',
            'exclude_from_wallet_stats' => true,
        ];
        if ($donation->organization?->name) {
            $meta['organization_name'] = $donation->organization->name;
        }

        $stripeRef = (string) ($donation->transaction_id ?? '');
        if ($stripeRef !== '') {
            if (str_starts_with($stripeRef, 'pi_')) {
                $meta['stripe_payment_intent'] = $stripeRef;
            } elseif (str_starts_with($stripeRef, 'sub_')) {
                $meta['stripe_subscription_id'] = $stripeRef;
            } elseif (str_starts_with($stripeRef, 'cs_')) {
                $meta['stripe_session_id'] = $stripeRef;
            }
        }

        $ledgerTxId = null;
        if ($stripeRef !== '' && (str_starts_with($stripeRef, 'pi_')
            || str_starts_with($stripeRef, 'sub_')
            || str_starts_with($stripeRef, 'cs_')
            || str_starts_with($stripeRef, 'ch_'))) {
            $ledgerTxId = $stripeRef.'-donor';
        }

        $payload = [
            'type' => 'purchase',
            'amount' => $amountDollars,
            'fee' => 0,
            'payment_method' => 'donation',
            'related_type' => Donation::class,
            'related_id' => $donation->id,
            'meta' => $meta,
        ];
        if ($ledgerTxId !== null) {
            $payload['transaction_id'] = $ledgerTxId;
        }

        $donation->user->recordTransaction($payload);
    }

    /**
     * Recipient deposit ledger row for direct org credit (non–Care-Alliance split path).
     * When {@see $incrementBalance} is false, only the transaction row is created (backfill when balance was already credited).
     */
    public static function recordRecipientDepositIfMissing(Donation $donation, bool $incrementBalance): void
    {
        $donation->loadMissing('organization.user');
        if (! $donation->organization || ! $donation->organization->user) {
            return;
        }

        $recipient = $donation->organization->user;
        $exists = Transaction::query()
            ->where('user_id', $recipient->id)
            ->where('type', 'deposit')
            ->where(function ($q) use ($donation) {
                $q->where(function ($q2) use ($donation) {
                    $q2->where('related_type', Donation::class)->where('related_id', $donation->id);
                })->orWhere(function ($q2) use ($donation) {
                    $q2->where('meta->donation_id', $donation->id)
                        ->where(function ($q3) {
                            $q3->where('meta->source', 'organization_donation')
                                ->orWhere('meta->source', 'care_alliance_split');
                        });
                });
            })
            ->exists();
        if ($exists) {
            return;
        }

        $amountDollars = (float) $donation->amount;

        $meta = [
            'donation_id' => $donation->id,
            'organization_id' => $donation->organization_id,
            'source' => 'organization_donation',
        ];
        if ($donation->organization->name) {
            $meta['organization_name'] = $donation->organization->name;
        }

        $stripeRef = (string) ($donation->transaction_id ?? '');
        if ($stripeRef !== '') {
            if (str_starts_with($stripeRef, 'pi_')) {
                $meta['stripe_payment_intent'] = $stripeRef;
            } elseif (str_starts_with($stripeRef, 'sub_')) {
                $meta['stripe_subscription_id'] = $stripeRef;
            } elseif (str_starts_with($stripeRef, 'cs_')) {
                $meta['stripe_session_id'] = $stripeRef;
            }
        }

        $ledgerTransactionId = null;
        if ($stripeRef !== '' && (str_starts_with($stripeRef, 'pi_')
            || str_starts_with($stripeRef, 'sub_')
            || str_starts_with($stripeRef, 'cs_')
            || str_starts_with($stripeRef, 'ch_'))) {
            $ledgerTransactionId = $stripeRef;
        }

        if ($incrementBalance) {
            $recipient->increment('balance', $amountDollars);
        }

        if (! $incrementBalance) {
            $meta['ledger_backfill'] = true;
            $meta['backfilled_at'] = now()->toIso8601String();
        }

        $txPayload = [
            'type' => 'deposit',
            'amount' => $amountDollars,
            'fee' => 0,
            'payment_method' => 'donation',
            'related_type' => Donation::class,
            'related_id' => $donation->id,
            'meta' => $meta,
        ];
        if ($ledgerTransactionId !== null) {
            $txPayload['transaction_id'] = $ledgerTransactionId;
        }

        $recipient->recordTransaction($txPayload);
    }

    /**
     * Whether this donation used Care Alliance financial distribution (splits / pool), not a simple org credit.
     */
    public static function donationUsesCareAllianceDistribution(Donation $donation): bool
    {
        if (! $donation->care_alliance_id) {
            return false;
        }
        $alliance = CareAlliance::query()->find($donation->care_alliance_id);

        return $alliance && $alliance->financial_settings_completed_at;
    }
}
