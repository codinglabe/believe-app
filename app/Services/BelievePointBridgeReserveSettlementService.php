<?php

namespace App\Services;

use App\Models\BelievePointPurchase;
use App\Models\BelievePointReserveSettlementAllocation;
use App\Models\BelievePointReserveSettlementCredit;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Dual-gate BP purchase settlement: Stripe funds available + Bridge reserve credit confirmed.
 *
 * @see https://apidocs.bridge.xyz/platform/orchestration/transfers/transfer-states
 * Terminal inbound state for reserve: payment_processed (wallet activity / transfer to platform reserve).
 */
final class BelievePointBridgeReserveSettlementService
{
    /**
     * @param  array<string, mixed>  $metadata
     */
    public static function recordTransferCredit(array $eventObject, string $state): void
    {
        if (! self::isTerminalReserveInboundState($state)) {
            return;
        }

        $destination = is_array($eventObject['destination'] ?? null) ? $eventObject['destination'] : [];
        $destinationWalletId = trim((string) ($destination['bridge_wallet_id'] ?? ''));
        if ($destinationWalletId === '' || ! app(BridgeService::class)->isConfiguredPlatformReserveWallet($destinationWalletId)) {
            return;
        }

        $transferId = trim((string) ($eventObject['id'] ?? ''));
        $amount = self::extractTransferAmount($eventObject);
        if ($transferId === '' || $amount <= 0) {
            return;
        }

        self::ingestReserveCredit(
            amount: $amount,
            bridgeTransferId: $transferId,
            bridgeActivityId: null,
            bridgeWalletId: $destinationWalletId,
            bridgeCustomerId: trim((string) ($eventObject['on_behalf_of'] ?? $eventObject['customer_id'] ?? '')),
            bridgeState: strtolower(trim($state)),
            sourceType: 'bridge_transfer',
            metadata: [
                'event' => 'transfer',
                'source' => $eventObject['source'] ?? null,
                'destination' => $destination,
                'client_reference_id' => $eventObject['client_reference_id'] ?? null,
            ],
        );
    }

    /**
     * @param  array<string, mixed>  $eventObject
     */
    public static function recordWalletActivityCredit(array $eventObject): void
    {
        $walletId = trim((string) ($eventObject['bridge_wallet_id'] ?? ''));
        if ($walletId === '' || ! app(BridgeService::class)->isConfiguredPlatformReserveWallet($walletId)) {
            return;
        }

        $activityType = strtolower(trim((string) ($eventObject['type'] ?? '')));
        if (! in_array($activityType, ['deposit', 'direct_deposit', 'transfer', 'transfer_in'], true)) {
            return;
        }

        $amount = round(max(0, (float) ($eventObject['amount'] ?? 0)), 2);
        if ($amount <= 0) {
            return;
        }

        $activityId = trim((string) ($eventObject['id'] ?? ''));
        if ($activityId === '') {
            return;
        }

        $paymentRoute = is_array($eventObject['payment_route'] ?? null) ? $eventObject['payment_route'] : [];
        $transferId = trim((string) ($paymentRoute['transfer_id'] ?? ''));

        self::ingestReserveCredit(
            amount: $amount,
            bridgeTransferId: $transferId !== '' ? $transferId : null,
            bridgeActivityId: $activityId,
            bridgeWalletId: $walletId,
            bridgeCustomerId: trim((string) ($paymentRoute['customer_id'] ?? '')),
            bridgeState: $activityType,
            sourceType: 'bridge_wallet_activity',
            metadata: [
                'event' => 'bridge_wallet.activity',
                'activity_type' => $activityType,
                'payment_route' => $paymentRoute,
            ],
        );
    }

    public static function autoConfirmIfBridgeNotRequired(BelievePointPurchase $purchase): void
    {
        if (! self::requiresBridgeReserveConfirmation()) {
            self::markBridgeConfirmed($purchase, 'auto:bridge_not_required');
        } elseif (app(BridgeService::class)->isSandbox()) {
            self::markBridgeConfirmed($purchase, 'auto:sandbox');
        }
    }

    public static function requiresBridgeReserveConfirmation(): bool
    {
        return BelievePointsPurchaseSettingsService::requireBridgeReserveConfirmation();
    }

    public static function prepareStripeOnlySettlement(): int
    {
        if (self::requiresBridgeReserveConfirmation()) {
            return 0;
        }

        $prepared = 0;

        BelievePointPurchase::query()
            ->where('status', 'completed')
            ->where('points_released', false)
            ->orderBy('id')
            ->each(function (BelievePointPurchase $purchase) use (&$prepared) {
                $hadBridgeConfirm = $purchase->bridge_reserve_confirmed_at !== null;

                self::autoConfirmIfBridgeNotRequired($purchase->fresh());
                self::syncPurchaseReleaseSchedule($purchase->fresh());

                if (! $hadBridgeConfirm && $purchase->fresh()->bridge_reserve_confirmed_at !== null) {
                    $prepared++;
                }
            });

        return $prepared;
    }

    public static function syncPurchaseReleaseSchedule(BelievePointPurchase $purchase): void
    {
        $purchase->refresh();
        self::autoConfirmIfBridgeNotRequired($purchase);
        $effective = self::effectiveReleaseAt($purchase->fresh());
        if ($effective === null) {
            return;
        }

        $purchase->update(['points_available_at' => $effective]);

        if (self::purchaseReadyForRelease($purchase->fresh()) && $effective->lte(now())) {
            BelievePointPurchaseSettlementService::releasePurchasePoints($purchase->fresh());
        }
    }

    public static function purchaseReadyForRelease(BelievePointPurchase $purchase): bool
    {
        if ($purchase->status !== 'completed' || $purchase->points_released) {
            return false;
        }

        $stripeAt = $purchase->stripe_funds_available_at ?? $purchase->points_available_at;
        if ($stripeAt === null || $stripeAt->isFuture()) {
            return false;
        }

        if (self::requiresBridgeReserveConfirmation() && ! app(BridgeService::class)->isSandbox()) {
            return $purchase->bridge_reserve_confirmed_at !== null;
        }

        return true;
    }

    public static function effectiveReleaseAt(BelievePointPurchase $purchase): ?Carbon
    {
        $stripeAt = $purchase->stripe_funds_available_at ?? $purchase->points_available_at;
        $bridgeAt = $purchase->bridge_reserve_confirmed_at;

        if (! self::requiresBridgeReserveConfirmation() || app(BridgeService::class)->isSandbox()) {
            return $stripeAt;
        }

        if ($stripeAt === null || $bridgeAt === null) {
            return null;
        }

        return $stripeAt->greaterThan($bridgeAt) ? $stripeAt : $bridgeAt;
    }

    /**
     * Poll Bridge reserve wallet history for missed webhooks.
     */
    public static function reconcileFromBridgeApi(int $limit = 100): int
    {
        if (! self::requiresBridgeReserveConfirmation() || app(BridgeService::class)->isSandbox()) {
            return 0;
        }

        $reserve = app(BelievePointsWalletTransferSettingsService::class)->resolvedPrefundedWallet();
        if ($reserve === null) {
            return 0;
        }

        $customerId = $reserve['customer_id'];
        $walletId = $reserve['wallet_id'];
        if ($customerId === '' || $walletId === '') {
            return 0;
        }

        $result = app(BridgeService::class)->getBridgeWalletHistory($customerId, $walletId, ['limit' => $limit]);
        if (! ($result['success'] ?? false)) {
            return 0;
        }

        $rows = app(BridgeService::class)->normalizeBridgeListData($result);
        $count = 0;
        foreach ($rows as $row) {
            if (! is_array($row)) {
                continue;
            }
            $before = BelievePointReserveSettlementCredit::query()->count();
            self::recordWalletActivityCredit($row);
            if (BelievePointReserveSettlementCredit::query()->count() > $before) {
                $count++;
            }
        }

        $count += self::reallocateExistingReserveCredits();

        BelievePointPurchaseSettlementService::releaseDueProcessingPoints();

        return $count;
    }

    /**
     * Match existing unallocated Bridge reserve credits to purchases still awaiting confirmation.
     */
    public static function reallocateExistingReserveCredits(): int
    {
        if (! self::requiresBridgeReserveConfirmation() || app(BridgeService::class)->isSandbox()) {
            return 0;
        }

        $allocated = 0;

        BelievePointReserveSettlementCredit::query()
            ->whereColumn('allocated_amount', '<', 'amount')
            ->orderBy('id')
            ->each(function (BelievePointReserveSettlementCredit $credit) use (&$allocated) {
                $pendingBefore = BelievePointPurchase::query()
                    ->where('status', 'completed')
                    ->where('points_released', false)
                    ->whereNull('bridge_reserve_confirmed_at')
                    ->count();

                if ($pendingBefore === 0) {
                    return false;
                }

                self::allocateCreditToPurchases($credit->fresh());

                $pendingAfter = BelievePointPurchase::query()
                    ->where('status', 'completed')
                    ->where('points_released', false)
                    ->whereNull('bridge_reserve_confirmed_at')
                    ->count();

                $allocated += max(0, $pendingBefore - $pendingAfter);
            });

        if ($allocated > 0) {
            BelievePointPurchaseSettlementService::releaseDueProcessingPoints();
        }

        return $allocated;
    }

    /**
     * @param  array<string, mixed>  $metadata
     */
    private static function ingestReserveCredit(
        float $amount,
        ?string $bridgeTransferId,
        ?string $bridgeActivityId,
        ?string $bridgeWalletId,
        ?string $bridgeCustomerId,
        string $bridgeState,
        string $sourceType,
        array $metadata = [],
    ): void {
        $amount = round(max(0, $amount), 2);
        if ($amount <= 0) {
            return;
        }

        DB::transaction(function () use ($amount, $bridgeTransferId, $bridgeActivityId, $bridgeWalletId, $bridgeCustomerId, $bridgeState, $sourceType, $metadata) {
            if ($bridgeTransferId !== null && $bridgeTransferId !== '') {
                $existing = BelievePointReserveSettlementCredit::query()
                    ->where('bridge_transfer_id', $bridgeTransferId)
                    ->first();
                if ($existing !== null) {
                    return;
                }
            }

            if ($bridgeActivityId !== null && $bridgeActivityId !== '') {
                $existing = BelievePointReserveSettlementCredit::query()
                    ->where('bridge_activity_id', $bridgeActivityId)
                    ->first();
                if ($existing !== null) {
                    return;
                }
            }

            $credit = BelievePointReserveSettlementCredit::query()->create([
                'amount' => $amount,
                'allocated_amount' => 0,
                'bridge_transfer_id' => $bridgeTransferId,
                'bridge_activity_id' => $bridgeActivityId,
                'bridge_wallet_id' => $bridgeWalletId,
                'bridge_customer_id' => $bridgeCustomerId,
                'bridge_state' => $bridgeState,
                'source_type' => $sourceType,
                'metadata' => $metadata,
                'credited_at' => now(),
            ]);

            if (self::requiresBridgeReserveConfirmation()) {
                self::allocateCreditToPurchases($credit);
            }
        });
    }

    private static function allocateCreditToPurchases(BelievePointReserveSettlementCredit $credit): void
    {
        $remaining = $credit->remainingAmount();
        if ($remaining <= 0) {
            return;
        }

        $purchases = BelievePointPurchase::query()
            ->where('status', 'completed')
            ->where('points_released', false)
            ->whereNull('bridge_reserve_confirmed_at')
            ->whereNotNull('stripe_funds_available_at')
            ->orderBy('id')
            ->lockForUpdate()
            ->get();

        foreach ($purchases as $purchase) {
            if ($remaining <= 0) {
                break;
            }

            $needed = round((float) $purchase->points, 2);
            if ($needed <= 0 || $remaining + 0.000001 < $needed) {
                continue;
            }

            if (BelievePointReserveSettlementAllocation::query()->where('believe_point_purchase_id', $purchase->id)->exists()) {
                continue;
            }

            BelievePointReserveSettlementAllocation::query()->create([
                'believe_point_reserve_settlement_credit_id' => $credit->id,
                'believe_point_purchase_id' => $purchase->id,
                'amount' => $needed,
            ]);

            $remaining = round($remaining - $needed, 2);
            $credit->allocated_amount = round((float) $credit->allocated_amount + $needed, 2);
            $credit->save();

            self::markBridgeConfirmed(
                $purchase,
                $credit->bridge_transfer_id ?: $credit->bridge_activity_id ?: ('credit:'.$credit->id),
            );
        }
    }

    private static function markBridgeConfirmed(BelievePointPurchase $purchase, string $reference): void
    {
        if ($purchase->bridge_reserve_confirmed_at !== null) {
            return;
        }

        $purchase->update([
            'bridge_reserve_confirmed_at' => now(),
            'bridge_settlement_reference' => $reference,
        ]);

        Log::info('Believe Points purchase: Bridge reserve settlement confirmed', [
            'purchase_id' => $purchase->id,
            'reference' => $reference,
        ]);

        self::syncPurchaseReleaseSchedule($purchase->fresh());
    }

    private static function isTerminalReserveInboundState(string $state): bool
    {
        return in_array(strtolower(trim($state)), [
            'payment_processed',
            'completed',
            'settled',
        ], true);
    }

    /**
     * @param  array<string, mixed>  $eventObject
     */
    private static function extractTransferAmount(array $eventObject): float
    {
        $receipt = is_array($eventObject['receipt'] ?? null) ? $eventObject['receipt'] : [];
        foreach (['final_amount', 'subtotal_amount', 'initial_amount'] as $key) {
            $value = $receipt[$key] ?? $eventObject[$key] ?? null;
            if ($value !== null && is_numeric($value)) {
                $amount = round((float) $value, 2);
                if ($amount > 0) {
                    return $amount;
                }
            }
        }

        return round(max(0, (float) ($eventObject['amount'] ?? 0)), 2);
    }
}
