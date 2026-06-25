<?php

namespace App\Services;

use App\Models\BelievePointWalletTransfer;
use App\Models\Transaction;

class BelievePointsWalletTransferLedgerService
{
    /**
     * Admin ledger: one `transactions` row per BP → Bridge wallet transfer, kept in sync on save.
     */
    public static function syncAdminLedgerRow(BelievePointWalletTransfer $transfer): void
    {
        if (! $transfer->user_id) {
            return;
        }

        $tx = Transaction::query()
            ->where('related_id', $transfer->id)
            ->where(function ($q) {
                $q->where('related_type', BelievePointWalletTransfer::class)
                    ->orWhere('related_type', 'like', '%BelievePointWalletTransfer');
            })
            ->orderBy('id')
            ->first();

        $amount = round((float) $transfer->amount, 2);
        $metadata = is_array($transfer->metadata) ? $transfer->metadata : [];
        $bridgeTransferId = trim((string) ($transfer->bridge_transfer_id ?? ''));

        $status = match ($transfer->status) {
            BelievePointWalletTransfer::STATUS_COMPLETED => Transaction::STATUS_COMPLETED,
            BelievePointWalletTransfer::STATUS_FAILED => Transaction::STATUS_FAILED,
            BelievePointWalletTransfer::STATUS_REFUNDED => Transaction::STATUS_REFUND,
            BelievePointWalletTransfer::STATUS_SUBMITTED => Transaction::STATUS_PENDING,
            default => Transaction::STATUS_PENDING,
        };

        $referenceId = $bridgeTransferId !== ''
            ? $bridgeTransferId
            : 'believe_points_wallet_transfer:'.$transfer->id;

        $meta = [
            'source' => 'believe_points_wallet_transfer',
            'type' => 'believe_points_wallet_transfer',
            'believe_point_wallet_transfer_id' => $transfer->id,
            'believe_point_wallet_transfer_status' => $transfer->status,
            'bridge_transfer_id' => $bridgeTransferId !== '' ? $bridgeTransferId : null,
            'bridge_transfer_state' => $transfer->bridge_transfer_state,
            'recipient_customer_id' => $metadata['recipient_customer_id'] ?? null,
            'recipient_wallet_id' => $metadata['recipient_wallet_id'] ?? null,
            'points_amount' => $amount,
            'gross_amount' => $amount,
            'description' => self::ledgerDescription($transfer),
            'awaiting_liquidity' => (bool) ($metadata['awaiting_liquidity'] ?? false),
            'failure_message' => $transfer->failure_message,
        ];

        if ($transfer->status === BelievePointWalletTransfer::STATUS_REFUNDED) {
            $meta['refund_amount'] = $amount;
        }

        $processedAt = in_array($transfer->status, [
            BelievePointWalletTransfer::STATUS_COMPLETED,
            BelievePointWalletTransfer::STATUS_FAILED,
            BelievePointWalletTransfer::STATUS_REFUNDED,
        ], true)
            ? ($transfer->completed_at ?? $transfer->updated_at ?? now())
            : null;

        $attrs = [
            'user_id' => $transfer->user_id,
            'related_id' => $transfer->id,
            'related_type' => BelievePointWalletTransfer::class,
            'type' => 'believe_points_wallet_transfer',
            'status' => $status,
            'amount' => $amount,
            'fee' => 0,
            'currency' => 'USD',
            'payment_method' => 'believe_points',
            'transaction_id' => $referenceId,
            'processed_at' => $processedAt,
            'meta' => array_filter(
                $meta,
                static fn ($value) => $value !== null && $value !== ''
            ),
        ];

        if ($tx) {
            $tx->update($attrs);
        } else {
            Transaction::create($attrs);
        }
    }

    private static function ledgerDescription(BelievePointWalletTransfer $transfer): string
    {
        return match ($transfer->status) {
            BelievePointWalletTransfer::STATUS_PENDING => 'Believe Points moved to wallet (pending liquidity)',
            BelievePointWalletTransfer::STATUS_SUBMITTED => 'Believe Points moved to wallet (processing)',
            BelievePointWalletTransfer::STATUS_COMPLETED => 'Believe Points moved to Believe wallet',
            BelievePointWalletTransfer::STATUS_REFUNDED => 'Believe Points wallet transfer refunded',
            BelievePointWalletTransfer::STATUS_FAILED => 'Believe Points wallet transfer failed',
            default => 'Believe Points moved to wallet',
        };
    }
}
