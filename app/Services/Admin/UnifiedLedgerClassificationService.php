<?php

namespace App\Services\Admin;

use App\Models\BelievePointPurchase;
use App\Models\BelievePointProcessingLot;
use App\Models\BelievePointWalletTransfer;
use App\Models\Transaction;
use App\Support\UnifiedLedgerBpStatus;
use App\Support\UnifiedLedgerBrpActivity;
use App\Support\UnifiedLedgerOwner;
use App\Support\UnifiedLedgerType;
use Carbon\CarbonInterface;

/**
 * Resolves Money / BP / BRP ledger classification for admin transaction history.
 */
final class UnifiedLedgerClassificationService
{
    /**
     * @return array{
     *     ledger_type: string,
     *     bp_status: string|null,
     *     brp_activity_type: string|null,
     *     current_owner: string|null,
     *     available_at: \Carbon\CarbonInterface|null
     * }
     */
    public static function classify(Transaction $transaction): array
    {
        if ($transaction->ledger_type && in_array($transaction->ledger_type, UnifiedLedgerType::all(), true)) {
            $meta = is_array($transaction->meta) ? $transaction->meta : [];
            $bpStatus = UnifiedLedgerBpStatus::normalize($transaction->bp_status);

            if ($transaction->ledger_type === UnifiedLedgerType::BRP
                && ($bpStatus === null || $bpStatus === UnifiedLedgerBpStatus::NA)) {
                $bpStatus = self::resolveBrpSettlementStatus($transaction, $meta) ?? UnifiedLedgerBpStatus::NA;
            }

            return [
                'ledger_type' => $transaction->ledger_type,
                'bp_status' => $bpStatus,
                'brp_activity_type' => $transaction->brp_activity_type,
                'current_owner' => UnifiedLedgerOwner::normalize($transaction->current_owner),
                'available_at' => $bpStatus === UnifiedLedgerBpStatus::PROCESSING
                    ? null
                    : $transaction->available_at,
            ];
        }

        $meta = is_array($transaction->meta) ? $transaction->meta : [];
        $ledgerType = self::inferLedgerType($transaction, $meta);

        return [
            'ledger_type' => $ledgerType,
            'bp_status' => self::inferBpStatus($ledgerType, $transaction, $meta),
            'brp_activity_type' => self::inferBrpActivity($ledgerType, $transaction, $meta),
            'current_owner' => self::inferCurrentOwner($ledgerType, $transaction, $meta),
            'available_at' => self::inferAvailableAt($ledgerType, $transaction, $meta),
        ];
    }

    /**
     * @return array{
     *     ledger_type: string,
     *     ledger_type_label: string,
     *     bp_status: string|null,
     *     bp_status_label: string,
     *     brp_activity_type: string|null,
     *     brp_activity_label: string,
     *     current_owner: string|null,
     *     available_at: string|null,
     *     display_status: string,
     *     display_status_label: string
     * }
     */
    public static function presentForTransaction(Transaction $transaction): array
    {
        $classified = self::classify($transaction);
        $bpStatus = $classified['bp_status'];
        $brpActivity = $classified['brp_activity_type'];
        $availableAt = $classified['available_at'];

        if ($bpStatus === UnifiedLedgerBpStatus::PROCESSING) {
            $availableAt = null;
        }

        $displayStatus = self::resolveDisplayStatus($transaction, $classified);

        return [
            'ledger_type' => $classified['ledger_type'],
            'ledger_type_label' => UnifiedLedgerType::label($classified['ledger_type']),
            'bp_status' => $bpStatus,
            'bp_status_label' => UnifiedLedgerBpStatus::label($bpStatus ?? UnifiedLedgerBpStatus::NA),
            'brp_activity_type' => $brpActivity,
            'brp_activity_label' => UnifiedLedgerBrpActivity::label($brpActivity ?? UnifiedLedgerBrpActivity::NA),
            'current_owner' => $classified['current_owner'],
            'available_at' => $availableAt instanceof CarbonInterface
                ? $availableAt->toIso8601String()
                : null,
            'display_status' => $displayStatus,
            'display_status_label' => self::displayStatusLabel($displayStatus, $classified),
        ];
    }

    /**
     * @param  array<string, mixed>  $meta
     */
    private static function inferLedgerType(Transaction $transaction, array $meta): string
    {
        if (($meta['ledger_type'] ?? '') === UnifiedLedgerType::BRP) {
            return UnifiedLedgerType::BRP;
        }

        if (($meta['ledger_type'] ?? '') === UnifiedLedgerType::BP) {
            return UnifiedLedgerType::BP;
        }

        if (($meta['source'] ?? '') === 'bp_redemption' || $transaction->type === 'bp_redemption') {
            return UnifiedLedgerType::BP;
        }

        if (($meta['source'] ?? '') === 'bridge_wallet_transfer' || $transaction->type === 'bridge_wallet_transfer') {
            return UnifiedLedgerType::MONEY;
        }

        if (str_starts_with((string) ($transaction->transaction_id ?? ''), 'bp_redemption:')) {
            return UnifiedLedgerType::BP;
        }

        if (str_starts_with((string) ($transaction->transaction_id ?? ''), 'bridge_wallet_transfer:')) {
            return UnifiedLedgerType::MONEY;
        }

        if ($transaction->type === 'bp_settlement') {
            return UnifiedLedgerType::BP;
        }

        if (($meta['source'] ?? '') === 'bp_settlement') {
            return UnifiedLedgerType::BP;
        }

        if (($meta['source'] ?? '') === 'believe_points_wallet_transfer') {
            return UnifiedLedgerType::BP;
        }

        if ($transaction->type === 'believe_points_wallet_transfer') {
            return UnifiedLedgerType::BP;
        }

        if (($meta['source'] ?? '') === 'believe_points_donation') {
            return UnifiedLedgerType::BP;
        }

        if (($meta['source'] ?? '') === 'believe_points_purchase_bp') {
            return UnifiedLedgerType::BP;
        }

        if (($meta['source'] ?? '') === 'believe_points_purchase' && ($meta['ledger_role'] ?? '') === 'bp_credit') {
            return UnifiedLedgerType::BP;
        }

        if (($meta['source'] ?? '') === 'reward_point_ledger') {
            return UnifiedLedgerType::BRP;
        }

        if (str_starts_with((string) ($transaction->transaction_id ?? ''), 'brp:')) {
            return UnifiedLedgerType::BRP;
        }

        if (str_starts_with((string) ($transaction->transaction_id ?? ''), 'bp_credit:')) {
            return UnifiedLedgerType::BP;
        }

        return UnifiedLedgerType::MONEY;
    }

    /**
     * @param  array<string, mixed>  $meta
     */
    private static function inferBpStatus(string $ledgerType, Transaction $transaction, array $meta): ?string
    {
        if ($ledgerType === UnifiedLedgerType::BRP) {
            $raw = strtolower(trim((string) ($meta['brp_status'] ?? $meta['bp_status'] ?? $transaction->bp_status ?? '')));
            if ($raw !== '' && ! in_array($raw, ['n/a', 'na'], true)) {
                return UnifiedLedgerBpStatus::normalize($raw);
            }

            return self::resolveBrpSettlementStatus($transaction, $meta) ?? UnifiedLedgerBpStatus::NA;
        }

        if ($ledgerType !== UnifiedLedgerType::BP) {
            return UnifiedLedgerBpStatus::NA;
        }

        $raw = strtolower(trim((string) ($meta['bp_status'] ?? $transaction->bp_status ?? '')));
        if ($raw !== '') {
            return UnifiedLedgerBpStatus::normalize($raw);
        }

        if ($transaction->type === 'bp_settlement' || ($meta['source'] ?? '') === 'bp_settlement') {
            return UnifiedLedgerBpStatus::AVAILABLE;
        }

        if ($transaction->status === Transaction::STATUS_REFUND) {
            return UnifiedLedgerBpStatus::REVERSED;
        }

        return UnifiedLedgerBpStatus::PROCESSING;
    }

    /**
     * @param  array<string, mixed>  $meta
     */
    private static function inferBrpActivity(string $ledgerType, Transaction $transaction, array $meta): ?string
    {
        if ($ledgerType !== UnifiedLedgerType::BRP) {
            return UnifiedLedgerBrpActivity::NA;
        }

        $raw = strtolower(trim((string) ($meta['brp_activity_type'] ?? $transaction->brp_activity_type ?? '')));
        if ($raw !== '') {
            return match ($raw) {
                'earned', 'credit' => UnifiedLedgerBrpActivity::EARNED,
                'redeemed', 'debit' => UnifiedLedgerBrpActivity::REDEEMED,
                'adjusted', 'adjustment' => UnifiedLedgerBrpActivity::ADJUSTED,
                'expired' => UnifiedLedgerBrpActivity::EXPIRED,
                'n/a', 'na' => UnifiedLedgerBrpActivity::NA,
                default => $raw,
            };
        }

        if ((float) $transaction->amount < 0 || ($meta['direction'] ?? '') === 'debit') {
            return UnifiedLedgerBrpActivity::REDEEMED;
        }

        return UnifiedLedgerBrpActivity::EARNED;
    }

    /**
     * @param  array<string, mixed>  $meta
     */
    private static function inferCurrentOwner(string $ledgerType, Transaction $transaction, array $meta): ?string
    {
        if ($ledgerType === UnifiedLedgerType::MONEY) {
            return null;
        }

        if (! empty($meta['current_owner'])) {
            return trim((string) $meta['current_owner']);
        }

        if (! empty($meta['current_bp_owner_name'])) {
            return trim((string) $meta['current_bp_owner_name']);
        }

        if (! empty($meta['organization_name'])) {
            return trim((string) $meta['organization_name']);
        }

        if (($meta['owner_type'] ?? '') === 'organization') {
            return trim((string) ($meta['organization_name'] ?? UnifiedLedgerOwner::ORGANIZATION));
        }

        if (($meta['owner_type'] ?? '') === 'merchant') {
            return trim((string) ($meta['merchant_name'] ?? UnifiedLedgerOwner::MERCHANT));
        }

        if (($meta['owner_type'] ?? '') === 'platform') {
            return UnifiedLedgerOwner::PLATFORM;
        }

        if ($ledgerType === UnifiedLedgerType::BP || $ledgerType === UnifiedLedgerType::BRP) {
            return $transaction->user?->name;
        }

        return UnifiedLedgerOwner::normalize($transaction->current_owner);
    }

    /**
     * @param  array<string, mixed>  $meta
     */
    private static function inferAvailableAt(string $ledgerType, Transaction $transaction, array $meta): ?CarbonInterface
    {
        if ($ledgerType !== UnifiedLedgerType::BP) {
            return null;
        }

        if (($meta['bp_status'] ?? $transaction->bp_status ?? '') === UnifiedLedgerBpStatus::PROCESSING) {
            return null;
        }

        if ($transaction->bp_status === UnifiedLedgerBpStatus::PROCESSING) {
            return null;
        }

        if ($transaction->available_at && $transaction->bp_status !== UnifiedLedgerBpStatus::PROCESSING) {
            return $transaction->available_at;
        }

        if ($transaction->type === 'bp_settlement' || ($meta['source'] ?? '') === 'bp_settlement') {
            $raw = $meta['settlement_date'] ?? null;
            if ($raw) {
                try {
                    return \Illuminate\Support\Carbon::parse($raw);
                } catch (\Throwable) {
                    return null;
                }
            }

            return $transaction->processed_at;
        }

        $bpStatus = UnifiedLedgerBpStatus::normalize(
            is_string($meta['bp_status'] ?? null) ? $meta['bp_status'] : $transaction->bp_status
        );
        if ($bpStatus !== UnifiedLedgerBpStatus::AVAILABLE) {
            return null;
        }

        $raw = $meta['settlement_date'] ?? $meta['points_available_at'] ?? null;
        if ($raw) {
            try {
                return \Illuminate\Support\Carbon::parse($raw);
            } catch (\Throwable) {
                return null;
            }
        }

        return null;
    }

    /**
     * @param  array{ledger_type: string, bp_status: string|null, brp_activity_type: string|null, current_owner: string|null, available_at: CarbonInterface|null}  $classified
     */
    private static function resolveDisplayStatus(Transaction $transaction, array $classified): string
    {
        $ledgerType = $classified['ledger_type'];
        $bpStatus = $classified['bp_status'];

        if (in_array($ledgerType, [UnifiedLedgerType::BP, UnifiedLedgerType::BRP], true)
            && $bpStatus === UnifiedLedgerBpStatus::PROCESSING) {
            return Transaction::STATUS_PENDING;
        }

        return (string) $transaction->status;
    }

    /**
     * @param  array{ledger_type: string, bp_status: string|null, brp_activity_type: string|null, current_owner: string|null, available_at: CarbonInterface|null}  $classified
     */
    private static function displayStatusLabel(string $displayStatus, array $classified): string
    {
        if ($displayStatus === Transaction::STATUS_PENDING
            && in_array($classified['ledger_type'], [UnifiedLedgerType::BP, UnifiedLedgerType::BRP], true)) {
            return 'Processing';
        }

        return ucfirst(str_replace('_', ' ', $displayStatus));
    }

    /**
     * Purchase-linked BRP earn rows follow the same settlement window as the BP purchase.
     *
     * @param  array<string, mixed>  $meta
     */
    private static function resolveBrpSettlementStatus(Transaction $transaction, array $meta): ?string
    {
        if (($meta['brp_activity_type'] ?? $transaction->brp_activity_type) === UnifiedLedgerBrpActivity::REDEEMED) {
            return null;
        }

        if ((float) $transaction->amount < 0) {
            return null;
        }

        $purchaseId = (int) ($meta['believe_point_purchase_id'] ?? 0);
        if ($purchaseId <= 0 && $transaction->related_id && is_string($transaction->related_type)
            && str_contains($transaction->related_type, 'BelievePointPurchase')) {
            $purchaseId = (int) $transaction->related_id;
        }
        if ($purchaseId <= 0 && str_starts_with((string) ($transaction->transaction_id ?? ''), 'brp:earned:purchase:')) {
            $purchaseId = (int) substr((string) $transaction->transaction_id, strlen('brp:earned:purchase:'));
        }

        if ($purchaseId <= 0) {
            return null;
        }

        $purchase = BelievePointPurchase::query()->find($purchaseId);
        if ($purchase === null || $purchase->status !== 'completed') {
            return null;
        }

        return $purchase->points_released
            ? UnifiedLedgerBpStatus::AVAILABLE
            : UnifiedLedgerBpStatus::PROCESSING;
    }
}
