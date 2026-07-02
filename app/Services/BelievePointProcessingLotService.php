<?php

namespace App\Services;

use App\Models\BelievePointProcessingLot;
use App\Models\BelievePointPurchase;
use App\Models\User;
use App\Services\Admin\UnifiedLedgerTransactionWriter;
use App\Services\BelievePointsWalletLedgerService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Tracks per-purchase Processing BP ownership so settlement credits whoever holds the lot.
 */
final class BelievePointProcessingLotService
{
    public static function createLotForPurchase(BelievePointPurchase $purchase, User $owner, float $amount): void
    {
        $amount = round(max(0, (float) $amount), 2);
        if ($amount <= 0) {
            return;
        }

        BelievePointProcessingLot::query()->create([
            'believe_point_purchase_id' => $purchase->id,
            'user_id' => $owner->id,
            'amount' => $amount,
            'metadata' => [
                'source' => 'believe_points_purchase',
            ],
        ]);
    }

    /**
     * Move Processing BP between users (donations). Ownership follows these lots at settlement.
     */
    public static function transferProcessingPoints(
        User $from,
        User $to,
        float $amount,
        array $metadata = [],
    ): bool {
        $amount = round(max(0, (float) $amount), 2);
        if ($amount <= 0) {
            return true;
        }

        return (bool) DB::transaction(function () use ($from, $to, $amount, $metadata) {
            $fromLocked = User::query()->lockForUpdate()->findOrFail($from->id);
            $toLocked = User::query()->lockForUpdate()->findOrFail($to->id);

            if ((float) ($fromLocked->processing_believe_points ?? 0) + 0.000001 < $amount) {
                return false;
            }

            $remaining = $amount;
            $lots = BelievePointProcessingLot::query()
                ->where('user_id', $fromLocked->id)
                ->whereNull('released_at')
                ->where('amount', '>', 0)
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            foreach ($lots as $lot) {
                if ($remaining <= 0) {
                    break;
                }

                $lotAmount = round((float) $lot->amount, 2);
                if ($lotAmount <= 0) {
                    continue;
                }

                $move = round(min($lotAmount, $remaining), 2);
                if ($move <= 0) {
                    continue;
                }

                if ($move + 0.000001 >= $lotAmount) {
                    $lot->update([
                        'user_id' => $toLocked->id,
                        'metadata' => array_merge(is_array($lot->metadata) ? $lot->metadata : [], $metadata),
                    ]);
                } else {
                    $lot->update(['amount' => round($lotAmount - $move, 2)]);
                    BelievePointProcessingLot::query()->create([
                        'believe_point_purchase_id' => $lot->believe_point_purchase_id,
                        'user_id' => $toLocked->id,
                        'amount' => $move,
                        'metadata' => array_merge(is_array($lot->metadata) ? $lot->metadata : [], $metadata),
                    ]);
                }

                $remaining = round($remaining - $move, 2);
            }

            if ($remaining > 0.000001) {
                Log::warning('Believe Points lot transfer: insufficient open lots', [
                    'from_user_id' => $fromLocked->id,
                    'to_user_id' => $toLocked->id,
                    'requested' => $amount,
                    'unallocated' => $remaining,
                ]);

                return false;
            }

            $fromLocked->decrement('processing_believe_points', $amount);
            $toLocked->increment('processing_believe_points', $amount);

            return true;
        });
    }

    /**
     * When Stripe funds settle, release all open lots for this purchase to each owner's Available BP.
     */
    public static function releaseLotsForPurchase(BelievePointPurchase $purchase): bool
    {
        $released = (bool) DB::transaction(function () use ($purchase) {
            /** @var BelievePointPurchase|null $lockedPurchase */
            $lockedPurchase = BelievePointPurchase::query()->lockForUpdate()->find($purchase->id);
            if ($lockedPurchase === null || $lockedPurchase->status !== 'completed' || $lockedPurchase->points_released) {
                return false;
            }

            if ($lockedPurchase->points_available_at && $lockedPurchase->points_available_at->isFuture()) {
                return false;
            }

            if (! BelievePointBridgeReserveSettlementService::purchaseReadyForRelease($lockedPurchase)) {
                return false;
            }

            $lots = BelievePointProcessingLot::query()
                ->where('believe_point_purchase_id', $lockedPurchase->id)
                ->whereNull('released_at')
                ->where('amount', '>', 0)
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            if ($lots->isEmpty()) {
                $lockedPurchase->update([
                    'points_released' => true,
                    'settlement_status' => BelievePointPurchaseSettlementStatusService::SETTLEMENT_AVAILABLE,
                    'settlement_at' => $lockedPurchase->bridge_reserve_confirmed_at ?? now(),
                ]);

                return true;
            }

            foreach ($lots as $lot) {
                $points = round((float) $lot->amount, 2);
                if ($points <= 0) {
                    $lot->update(['released_at' => now()]);

                    continue;
                }

                $owner = User::query()->lockForUpdate()->find($lot->user_id);
                if ($owner === null) {
                    continue;
                }

                if (! $owner->releaseProcessingBelievePoints($points)) {
                    Log::warning('Believe Points lot release: insufficient processing balance', [
                        'purchase_id' => $lockedPurchase->id,
                        'lot_id' => $lot->id,
                        'user_id' => $owner->id,
                        'points' => $points,
                    ]);

                    return false;
                }

                $lot->update(['released_at' => now()]);

                BelievePointSettlementLedgerService::recordLotRelease(
                    $lockedPurchase,
                    $lot->fresh(),
                    $owner,
                    $points,
                );

                BelievePointsWalletLedgerService::recordSettlement($lockedPurchase, $points);
            }

            $settlementAt = $lockedPurchase->bridge_reserve_confirmed_at ?? now();
            $lockedPurchase->update([
                'points_released' => true,
                'settlement_status' => BelievePointPurchaseSettlementStatusService::SETTLEMENT_AVAILABLE,
                'settlement_at' => $settlementAt,
            ]);

            Log::info('Believe Points purchase lots released to available', [
                'purchase_id' => $lockedPurchase->id,
                'lot_count' => $lots->count(),
            ]);

            return true;
        });

        if ($released) {
            $fresh = $purchase->fresh(['user']);
            if ($fresh?->user) {
                UnifiedLedgerTransactionWriter::syncBpCreditRow($fresh, $fresh->user);
            }
        }

        return $released;
    }

    public static function openProcessingTotalForUser(int $userId): float
    {
        return round((float) BelievePointProcessingLot::query()
            ->where('user_id', $userId)
            ->whereNull('released_at')
            ->sum('amount'), 2);
    }
}
