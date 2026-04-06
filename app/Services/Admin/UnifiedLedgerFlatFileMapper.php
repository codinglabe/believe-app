<?php

namespace App\Services\Admin;

use App\Models\Transaction;

/**
 * Maps unified ledger rows to the client's minimum flat-file columns (CSV / ETL).
 *
 * @see UnifiedLedgerPresenter::present()
 */
class UnifiedLedgerFlatFileMapper
{
    /** @var list<string> */
    public const CSV_HEADERS = [
        'transaction_number',
        'module',
        'transaction_type',
        'from_type',
        'from_id',
        'to_type',
        'to_id',
        'gross_amount',
        'processor_fee_amount',
        'platform_fee_amount',
        'split_amount',
        'refund_amount',
        'net_amount',
        'supplier_payout_amount',
        'organization_payout_amount',
        'platform_payout_amount',
        'status',
        'provider',
        'related_type',
        'related_id',
        'processed_at',
    ];

    /**
     * @param  array<string, mixed>  $unified  Output of UnifiedLedgerPresenter::present()
     * @return array<string, string|int|float|null>
     */
    public function map(Transaction $t, array $unified): array
    {
        $txnNumber = (string) ($t->transaction_id !== null && $t->transaction_id !== ''
            ? $t->transaction_id
            : 'TXN-'.$t->id);

        $relatedType = $t->related_type
            ? class_basename((string) $t->related_type)
            : '';

        $row = [
            'transaction_number' => $txnNumber,
            'module' => (string) ($unified['module'] ?? ''),
            'transaction_type' => $this->normalizeTransactionType((string) ($unified['transaction_type'] ?? '')),
            'from_type' => (string) ($unified['from_type'] ?? ''),
            'from_id' => $this->scalarId($unified['from_id'] ?? null),
            'to_type' => (string) ($unified['to_type'] ?? ''),
            'to_id' => $this->scalarId($unified['to_id'] ?? null),
            'gross_amount' => $this->money($unified['gross_amount'] ?? 0),
            'processor_fee_amount' => $this->money($unified['processor_fee_amount'] ?? 0),
            'platform_fee_amount' => $this->money($unified['biu_fee_amount'] ?? 0),
            'split_amount' => $this->money($unified['split_amount'] ?? 0),
            'refund_amount' => $this->money($unified['refund_amount'] ?? 0),
            'net_amount' => $this->nullableMoney($unified['net_amount'] ?? null),
            'supplier_payout_amount' => $this->nullableMoney($unified['supplier_payout_amount'] ?? null),
            'organization_payout_amount' => $this->nullableMoney($unified['organization_payout_amount'] ?? null),
            'platform_payout_amount' => $this->nullableMoney($unified['platform_payout_amount'] ?? null),
            'status' => (string) ($unified['status'] ?? $t->status ?? ''),
            'provider' => (string) ($unified['provider'] ?? ''),
            'related_type' => $relatedType,
            'related_id' => $t->related_id !== null ? (string) $t->related_id : '',
            'processed_at' => (string) ($unified['datetime_iso'] ?? ''),
        ];

        return $row;
    }

    /**
     * Client vocabulary: map internal-only types to their normalized set where needed.
     */
    private function normalizeTransactionType(string $type): string
    {
        return match ($type) {
            'tax_refund' => 'payment_refund',
            default => $type,
        };
    }

    private function scalarId(mixed $id): string
    {
        if ($id === null || $id === '') {
            return '';
        }

        return is_numeric($id) ? (string) (int) $id : (string) $id;
    }

    private function money(mixed $v): string
    {
        if ($v === null || $v === '') {
            return '0.00';
        }

        return number_format((float) $v, 2, '.', '');
    }

    private function nullableMoney(mixed $v): string
    {
        if ($v === null || $v === '') {
            return '';
        }

        return number_format((float) $v, 2, '.', '');
    }
}
