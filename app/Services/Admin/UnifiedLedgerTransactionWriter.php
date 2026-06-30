<?php

namespace App\Services\Admin;

use App\Models\BelievePointPurchase;
use App\Models\BelievePointProcessingLot;
use App\Models\Donation;
use App\Models\Organization;
use App\Models\RewardPointLedger;
use App\Models\Transaction;
use App\Models\User;
use App\Services\BelievePointPurchaseSettlementStatusService;
use App\Support\UnifiedLedgerBpStatus;
use App\Support\UnifiedLedgerBrpActivity;
use App\Support\UnifiedLedgerOwner;
use App\Support\UnifiedLedgerType;

/**
 * Writes Money / BP / BRP rows into the unified admin transaction history.
 */
final class UnifiedLedgerTransactionWriter
{
    public static function syncBelievePointPurchaseRows(BelievePointPurchase $purchase): void
    {
        if (! $purchase->user_id) {
            return;
        }

        $purchase->loadMissing('user');
        $user = $purchase->user;
        if (! $user) {
            return;
        }

        self::syncMoneyPurchaseRow($purchase);
        self::syncBpCreditRow($purchase, $user);

        $brp = round((float) ($purchase->reward_points_awarded ?? 0), 2);
        if ($brp > 0 && $purchase->status === 'completed') {
            self::syncBrpEarnedForPurchase($purchase, $user, $brp);
        }
    }

    public static function syncMoneyPurchaseRow(BelievePointPurchase $purchase): void
    {
        // Money row is maintained by BelievePointPurchaseSettlementService::syncAdminLedgerPurchaseRow.
        $tx = Transaction::query()
            ->where('related_id', $purchase->id)
            ->where('type', 'purchase')
            ->where(function ($q) {
                $q->where('related_type', BelievePointPurchase::class)
                    ->orWhere('related_type', 'like', '%BelievePointPurchase');
            })
            ->where(function ($q) {
                $q->whereNull('ledger_type')
                    ->orWhere('ledger_type', UnifiedLedgerType::MONEY);
            })
            ->orderBy('id')
            ->first();

        if ($tx) {
            $tx->forceFill([
                'ledger_type' => UnifiedLedgerType::MONEY,
                'bp_status' => UnifiedLedgerBpStatus::NA,
                'brp_activity_type' => UnifiedLedgerBrpActivity::NA,
                'current_owner' => null,
                'available_at' => null,
            ])->saveQuietly();
        }
    }

    public static function syncBpCreditRow(BelievePointPurchase $purchase, User $user): void
    {
        $points = round((float) $purchase->points, 2);
        if ($points <= 0) {
            return;
        }

        $bpStatus = self::bpStatusForPurchase($purchase);
        $status = match ($purchase->status) {
            'completed' => $bpStatus === UnifiedLedgerBpStatus::PROCESSING
                ? Transaction::STATUS_PENDING
                : Transaction::STATUS_COMPLETED,
            'failed' => Transaction::STATUS_FAILED,
            'cancelled' => Transaction::STATUS_CANCELLED,
            default => Transaction::STATUS_PENDING,
        };

        $availableAt = $purchase->points_released
            ? (BelievePointPurchaseSettlementStatusService::settlementDate($purchase) ?? $purchase->points_available_at)
            : null;

        $meta = [
            'source' => 'believe_points_purchase_bp',
            'ledger_type' => UnifiedLedgerType::BP,
            'ledger_role' => 'bp_credit',
            'believe_point_purchase_id' => $purchase->id,
            'intended_points' => $points,
            'bp_status' => $bpStatus,
            'owner_type' => 'supporter',
            'current_owner' => UnifiedLedgerOwner::SUPPORTER,
            'event_name' => 'BP Purchase',
            'description' => sprintf('Believe Points purchase credit (%s BP)', number_format($points, 2)),
            'from_type' => UnifiedLedgerOwner::PLATFORM,
            'from_name' => UnifiedLedgerOwner::PLATFORM,
            'to_type' => UnifiedLedgerOwner::SUPPORTER,
            'to_name' => $user->name,
            'to_id' => $user->id,
        ];

        if ($availableAt) {
            $meta['settlement_date'] = $availableAt->toIso8601String();
        }

        Transaction::query()->updateOrCreate(
            ['transaction_id' => 'bp_credit:purchase:'.$purchase->id],
            [
                'user_id' => $user->id,
                'related_id' => $purchase->id,
                'related_type' => BelievePointPurchase::class,
                'type' => 'purchase',
                'ledger_type' => UnifiedLedgerType::BP,
                'bp_status' => $bpStatus,
                'brp_activity_type' => UnifiedLedgerBrpActivity::NA,
                'current_owner' => UnifiedLedgerOwner::SUPPORTER,
                'available_at' => $availableAt,
                'status' => $status,
                'amount' => $points,
                'fee' => 0,
                'currency' => 'BP',
                'payment_method' => null,
                'processed_at' => $purchase->updated_at ?? now(),
                'meta' => $meta,
            ],
        );
    }

    public static function syncBpSettlementRow(
        BelievePointPurchase $purchase,
        BelievePointProcessingLot $lot,
        User $owner,
        float $points,
    ): void {
        $points = round(max(0, $points), 2);
        if ($points <= 0) {
            return;
        }

        $settlementAt = BelievePointPurchaseSettlementStatusService::settlementDate($purchase) ?? now();
        $reference = BelievePointPurchaseSettlementStatusService::settlementReference($purchase)
            ?? ('bp_settlement:purchase:'.$purchase->id.':lot:'.$lot->id);

        Transaction::query()->updateOrCreate(
            ['transaction_id' => $reference],
            [
                'user_id' => $owner->id,
                'related_id' => $lot->id,
                'related_type' => BelievePointProcessingLot::class,
                'type' => 'bp_settlement',
                'ledger_type' => UnifiedLedgerType::BP,
                'bp_status' => UnifiedLedgerBpStatus::AVAILABLE,
                'brp_activity_type' => UnifiedLedgerBrpActivity::NA,
                'current_owner' => UnifiedLedgerOwner::SUPPORTER,
                'available_at' => $settlementAt,
                'status' => Transaction::STATUS_COMPLETED,
                'amount' => $points,
                'fee' => 0,
                'currency' => 'BP',
                'payment_method' => 'believe_points',
                'processed_at' => $settlementAt,
                'meta' => [
                    'source' => 'bp_settlement',
                    'ledger_type' => UnifiedLedgerType::BP,
                    'believe_point_purchase_id' => $purchase->id,
                    'believe_point_processing_lot_id' => $lot->id,
                    'bp_status' => UnifiedLedgerBpStatus::AVAILABLE,
                    'owner_type' => 'supporter',
                    'event_name' => 'Processing BP to Available BP',
                    'description' => sprintf('Believe Points settlement: %s BP Processing → Available', number_format($points, 2)),
                    'from_type' => UnifiedLedgerOwner::SUPPORTER,
                    'from_name' => $owner->name,
                    'to_type' => UnifiedLedgerOwner::SUPPORTER,
                    'to_name' => $owner->name,
                    'to_id' => $owner->id,
                    'current_bp_owner_user_id' => $owner->id,
                    'current_bp_owner_name' => $owner->name,
                    'settlement_date' => $settlementAt->toIso8601String(),
                ],
            ],
        );

        self::syncBpCreditRow($purchase->fresh() ?? $purchase, $owner);
    }

    public static function syncBpDonationSpendRow(
        User $donor,
        Organization $organization,
        Donation $donation,
        float $amount,
        float $fromProcessing,
        float $fromAvailable,
    ): void {
        $amount = round(max(0, $amount), 2);
        if ($amount <= 0) {
            return;
        }

        $organization->loadMissing('user');
        $ownerLabel = $organization->name ?: UnifiedLedgerOwner::ORGANIZATION;
        $bpStatus = $fromProcessing > 0 && $fromAvailable <= 0
            ? UnifiedLedgerBpStatus::PROCESSING
            : UnifiedLedgerBpStatus::AVAILABLE;

        Transaction::query()->updateOrCreate(
            ['transaction_id' => 'bp_donation:donation:'.$donation->id.':donor:'.$donor->id],
            [
                'user_id' => $donor->id,
                'related_id' => $donation->id,
                'related_type' => Donation::class,
                'type' => 'donation',
                'ledger_type' => UnifiedLedgerType::BP,
                'bp_status' => $bpStatus,
                'brp_activity_type' => UnifiedLedgerBrpActivity::NA,
                'current_owner' => UnifiedLedgerOwner::ORGANIZATION,
                'available_at' => $bpStatus === UnifiedLedgerBpStatus::PROCESSING ? null : now(),
                'status' => $bpStatus === UnifiedLedgerBpStatus::PROCESSING
                    ? Transaction::STATUS_PENDING
                    : Transaction::STATUS_COMPLETED,
                'amount' => $amount,
                'fee' => 0,
                'currency' => 'BP',
                'payment_method' => 'believe_points',
                'processed_at' => now(),
                'meta' => [
                    'source' => 'believe_points_donation',
                    'ledger_type' => UnifiedLedgerType::BP,
                    'donation_id' => $donation->id,
                    'organization_id' => $donation->organization_id,
                    'from_processing' => $fromProcessing,
                    'from_available' => $fromAvailable,
                    'bp_status' => $bpStatus,
                    'owner_type' => 'organization',
                    'organization_name' => $organization->name,
                    'event_name' => 'Processing BP Donation',
                    'description' => 'Believe Points donation',
                    'from_type' => UnifiedLedgerOwner::SUPPORTER,
                    'from_name' => $donor->name,
                    'to_type' => UnifiedLedgerOwner::ORGANIZATION,
                    'to_name' => $ownerLabel,
                ],
            ],
        );
    }

    public static function syncBrpEarnedForPurchase(BelievePointPurchase $purchase, User $user, float $brp): void
    {
        $brp = round(max(0, $brp), 2);
        if ($brp <= 0) {
            return;
        }

        Transaction::query()->updateOrCreate(
            ['transaction_id' => 'brp:earned:purchase:'.$purchase->id],
            [
                'user_id' => $user->id,
                'related_id' => $purchase->id,
                'related_type' => BelievePointPurchase::class,
                'type' => 'reward',
                'ledger_type' => UnifiedLedgerType::BRP,
                'bp_status' => UnifiedLedgerBpStatus::NA,
                'brp_activity_type' => UnifiedLedgerBrpActivity::EARNED,
                'current_owner' => UnifiedLedgerOwner::SUPPORTER,
                'available_at' => null,
                'status' => Transaction::STATUS_COMPLETED,
                'amount' => $brp,
                'fee' => 0,
                'currency' => 'BRP',
                'payment_method' => null,
                'processed_at' => $purchase->updated_at ?? now(),
                'meta' => [
                    'source' => 'reward_point_ledger',
                    'ledger_type' => UnifiedLedgerType::BRP,
                    'brp_activity_type' => UnifiedLedgerBrpActivity::EARNED,
                    'believe_point_purchase_id' => $purchase->id,
                    'event_name' => 'BP Purchase Participation Reward',
                    'description' => 'Believe Reward Points earned for qualifying BP purchase',
                    'from_type' => UnifiedLedgerOwner::PLATFORM,
                    'from_name' => UnifiedLedgerOwner::PLATFORM,
                    'to_type' => UnifiedLedgerOwner::SUPPORTER,
                    'to_name' => $user->name,
                    'to_id' => $user->id,
                ],
            ],
        );
    }

    public static function syncFromRewardPointLedger(RewardPointLedger $entry): void
    {
        $activity = self::brpActivityForEntry($entry);

        $amount = round((float) $entry->points, 2);
        if ($entry->type === 'debit') {
            $amount = -abs($amount);
        }

        $user = $entry->user;
        $reference = 'brp:ledger:'.$entry->id;

        if (in_array($entry->source, ['believe_points_card_purchase', 'believe_points_ach_purchase'], true) && $entry->reference_id) {
            $reference = 'brp:earned:purchase:'.$entry->reference_id;
        }

        Transaction::query()->updateOrCreate(
            ['transaction_id' => $reference],
            [
                'user_id' => $entry->user_id,
                'related_id' => $entry->reference_id,
                'related_type' => null,
                'type' => $entry->type === 'debit' ? 'redemption' : 'reward',
                'ledger_type' => UnifiedLedgerType::BRP,
                'bp_status' => UnifiedLedgerBpStatus::NA,
                'brp_activity_type' => $activity,
                'current_owner' => UnifiedLedgerOwner::SUPPORTER,
                'available_at' => null,
                'status' => Transaction::STATUS_COMPLETED,
                'amount' => $amount,
                'fee' => 0,
                'currency' => 'BRP',
                'payment_method' => null,
                'processed_at' => $entry->created_at ?? now(),
                'meta' => [
                    'source' => 'reward_point_ledger',
                    'ledger_type' => UnifiedLedgerType::BRP,
                    'brp_activity_type' => $activity,
                    'reward_point_ledger_id' => $entry->id,
                    'reward_source' => $entry->source,
                    'direction' => $entry->type,
                    'event_name' => self::brpEventName($entry->source, $activity),
                    'description' => $entry->description,
                ],
            ],
        );
    }

    private static function bpStatusForPurchase(BelievePointPurchase $purchase): string
    {
        if ($purchase->refunded_at !== null) {
            return UnifiedLedgerBpStatus::REVERSED;
        }

        if ($purchase->points_released) {
            return UnifiedLedgerBpStatus::AVAILABLE;
        }

        if ($purchase->status === 'completed') {
            return UnifiedLedgerBpStatus::PROCESSING;
        }

        return UnifiedLedgerBpStatus::PROCESSING;
    }

    private static function brpActivityForEntry(RewardPointLedger $entry): string
    {
        $source = strtolower(trim((string) $entry->source));

        if (str_contains($source, 'expir')) {
            return UnifiedLedgerBrpActivity::EXPIRED;
        }

        if (str_contains($source, 'adjust') || in_array($source, ['manual', 'admin_adjustment'], true)) {
            return UnifiedLedgerBrpActivity::ADJUSTED;
        }

        if ($entry->type === 'debit') {
            return UnifiedLedgerBrpActivity::REDEEMED;
        }

        return UnifiedLedgerBrpActivity::EARNED;
    }

    private static function brpEventName(string $source, string $activity): string
    {
        if ($activity === UnifiedLedgerBrpActivity::REDEEMED) {
            return 'Merchant Hub Offer Redemption';
        }

        return match ($source) {
            'believe_points_card_purchase', 'believe_points_ach_purchase' => 'BP Purchase Participation Reward',
            default => 'Believe Reward Points '.UnifiedLedgerBrpActivity::label($activity),
        };
    }
}
