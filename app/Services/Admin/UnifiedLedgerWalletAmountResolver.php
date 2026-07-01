<?php

namespace App\Services\Admin;

use App\Models\Transaction;
use App\Support\UnifiedLedgerType;

/**
 * Wallet Amount = signed change to the supporter's total BP balance (ending − beginning).
 *
 * Not derived from event labels alone — reflects whether available + processing BP went up or down.
 */
final class UnifiedLedgerWalletAmountResolver
{
    /**
     * Signed BP/BRP wallet balance change. Null when the row is not a points wallet line.
     */
    public static function resolve(Transaction $transaction): ?float
    {
        $classified = UnifiedLedgerClassificationService::classify($transaction);
        $ledgerType = $classified['ledger_type'];
        $meta = is_array($transaction->meta) ? $transaction->meta : [];
        $stored = round((float) $transaction->amount, 2);

        if ($ledgerType === UnifiedLedgerType::BRP) {
            return $stored === 0.0 ? null : $stored;
        }

        if ($ledgerType !== UnifiedLedgerType::BP) {
            return null;
        }

        if (isset($meta['bp_wallet_delta']) && is_numeric($meta['bp_wallet_delta'])) {
            return round((float) $meta['bp_wallet_delta'], 2);
        }

        $source = (string) ($meta['source'] ?? '');
        $type = (string) $transaction->type;

        // Processing → Available moves do not change total BP.
        if ($type === 'bp_settlement' || $source === 'bp_settlement') {
            return 0.0;
        }

        // Refunded / reversed BP rows credit the supporter (+BP).
        if (strtoupper((string) ($transaction->currency ?? '')) === 'BP'
            && $transaction->status === Transaction::STATUS_REFUND
            && $stored > 0) {
            return $stored;
        }

        $points = round(abs($stored), 2);
        if ($points <= 0.0 && $stored === 0.0) {
            return null;
        }

        // Prefer signed amount on BP currency rows (balance delta stored at write time).
        if (strtoupper((string) ($transaction->currency ?? '')) === 'BP') {
            if ($stored < 0) {
                return $stored;
            }

            // Legacy rows stored positive amounts for debits (donation spend, etc.).
            return self::isBpDebitEvent($source, $type) ? -$points : $stored;
        }

        return $stored !== 0.0 ? $stored : null;
    }

    private static function isBpDebitEvent(string $source, string $type): bool
    {
        return in_array($source, [
            'bp_redemption',
            'believe_points_donation',
        ], true)
            || in_array($type, [
                'bp_redemption',
            ], true);
    }
}
