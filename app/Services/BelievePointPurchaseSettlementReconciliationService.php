<?php

namespace App\Services;

use App\Models\BelievePointPurchase;
use App\Models\User;
use Illuminate\Support\Facades\Log;

/**
 * Backfill BP settlement when Stripe / Bridge webhooks were missed.
 */
final class BelievePointPurchaseSettlementReconciliationService
{
    /**
     * @return array{examined: int, stripe_synced: int, bridge_credits_ingested: int, bridge_allocated: int, released: int}
     */
    public static function reconcilePendingPurchases(bool $dryRun = false): array
    {
        $stats = [
            'examined' => 0,
            'stripe_synced' => 0,
            'bridge_credits_ingested' => 0,
            'bridge_allocated' => 0,
            'released' => 0,
        ];

        BelievePointPurchase::query()
            ->where('status', 'completed')
            ->where('points_released', false)
            ->orderBy('id')
            ->each(function (BelievePointPurchase $purchase) use ($dryRun, &$stats) {
                $stats['examined']++;

                if ($dryRun) {
                    return;
                }

                if (StripeBelievePointSettlementScheduleService::syncPurchaseFromStripeApi($purchase)) {
                    $stats['stripe_synced']++;
                    Log::info('Believe Points reconciliation: synced Stripe settlement from API', [
                        'purchase_id' => $purchase->id,
                    ]);
                }

                StripeBelievePointSettlementWebhookService::attemptReleaseForPurchase($purchase->fresh());
            });

        if ($dryRun) {
            return $stats;
        }

        $stats['bridge_credits_ingested'] = BelievePointBridgeReserveSettlementService::reconcileFromBridgeApi();
        $stats['bridge_allocated'] = BelievePointBridgeReserveSettlementService::reallocateExistingReserveCredits();
        $stats['released'] = BelievePointPurchaseSettlementService::releaseDueProcessingPoints();

        if ($stats['stripe_synced'] > 0 || $stats['bridge_credits_ingested'] > 0 || $stats['bridge_allocated'] > 0 || $stats['released'] > 0) {
            Log::info('Believe Points settlement reconciliation finished', $stats);
        }

        return $stats;
    }

    /**
     * Lightweight Stripe sync for one supporter's stuck purchases (Believe Points page load).
     */
    public static function reconcilePendingPurchasesForUser(User $user): void
    {
        $userId = (int) $user->id;

        BelievePointPurchase::query()
            ->where('user_id', $userId)
            ->where('status', 'completed')
            ->where('points_released', false)
            ->orderBy('id')
            ->each(function (BelievePointPurchase $purchase) {
                if (StripeBelievePointSettlementScheduleService::syncPurchaseFromStripeApi($purchase)) {
                    Log::info('Believe Points user reconciliation: synced Stripe settlement from API', [
                        'purchase_id' => $purchase->id,
                        'user_id' => $purchase->user_id,
                    ]);
                }

                StripeBelievePointSettlementWebhookService::attemptReleaseForPurchase($purchase->fresh());
            });

        BelievePointBridgeReserveSettlementService::reallocateExistingReserveCredits();
        BelievePointPurchaseSettlementService::releaseDueProcessingPoints();
    }
}
