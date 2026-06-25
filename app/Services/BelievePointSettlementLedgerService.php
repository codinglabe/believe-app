<?php

namespace App\Services;

use App\Models\BelievePointProcessingLot;
use App\Models\BelievePointPurchase;
use App\Models\Transaction;
use App\Models\User;

/**
 * Audit ledger rows when Processing BP converts to Available BP at settlement.
 */
final class BelievePointSettlementLedgerService
{
    public static function recordLotRelease(
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

        $exists = Transaction::query()
            ->where('related_id', $lot->id)
            ->where(function ($q) {
                $q->where('related_type', BelievePointProcessingLot::class)
                    ->orWhere('related_type', 'like', '%BelievePointProcessingLot');
            })
            ->where('type', 'bp_settlement')
            ->exists();

        if ($exists) {
            return;
        }

        Transaction::create([
            'user_id' => $owner->id,
            'related_id' => $lot->id,
            'related_type' => BelievePointProcessingLot::class,
            'type' => 'bp_settlement',
            'status' => Transaction::STATUS_COMPLETED,
            'amount' => $points,
            'fee' => 0,
            'currency' => 'USD',
            'payment_method' => 'believe_points',
            'transaction_id' => $reference,
            'processed_at' => $settlementAt,
            'meta' => [
                'source' => 'bp_settlement',
                'type' => 'bp_settlement',
                'believe_point_purchase_id' => $purchase->id,
                'believe_point_processing_lot_id' => $lot->id,
                'bp_status' => BelievePointPurchaseSettlementStatusService::BP_AVAILABLE,
                'settlement_status' => BelievePointPurchaseSettlementStatusService::SETTLEMENT_AVAILABLE,
                'settlement_date' => $settlementAt->toIso8601String(),
                'settlement_reference' => $reference,
                'current_bp_owner_user_id' => $owner->id,
                'current_bp_owner_name' => $owner->name,
                'points_amount' => $points,
                'description' => sprintf(
                    'Believe Points settlement: %s BP Processing → Available',
                    number_format($points, 2)
                ),
            ],
        ]);
    }
}
