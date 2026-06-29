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
        'from_to',
        'subscriber_name',
        'subscriber_email',
        'organization_name',
        'organization_ein',
        'merchant_name',
        'campaign_name',
        'event_name',
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
        'related_name',
        'processed_at',
    ];

    /** @var array<string, string> */
    public const CSV_HEADER_LABELS = [
        'transaction_number' => 'Transaction Number',
        'module' => 'Module',
        'transaction_type' => 'Transaction Type',
        'from_to' => 'From → To',
        'subscriber_name' => 'Subscriber Name',
        'subscriber_email' => 'Subscriber Email',
        'organization_name' => 'Organization Name',
        'organization_ein' => 'Organization EIN',
        'merchant_name' => 'Merchant Name',
        'campaign_name' => 'Campaign Name',
        'event_name' => 'Event Name',
        'gross_amount' => 'Gross Amount',
        'processor_fee_amount' => 'Processor Fee Amount',
        'platform_fee_amount' => 'Platform Fee Amount',
        'split_amount' => 'Split Amount',
        'refund_amount' => 'Refund Amount',
        'net_amount' => 'Net Amount',
        'supplier_payout_amount' => 'Supplier Payout Amount',
        'organization_payout_amount' => 'Organization Payout Amount',
        'platform_payout_amount' => 'Platform Payout Amount',
        'status' => 'Status',
        'provider' => 'Provider',
        'related_name' => 'Related',
        'processed_at' => 'Processed At',
    ];

    /**
     * Human-readable Excel / CSV column titles (same order as {@see CSV_HEADERS}).
     *
     * @return list<string>
     */
    public static function exportHeadings(): array
    {
        return array_map(
            static fn (string $key): string => self::CSV_HEADER_LABELS[$key] ?? $key,
            self::CSV_HEADERS,
        );
    }

    /**
     * @param  array<string, mixed>  $unified  Output of UnifiedLedgerPresenter::present()
     * @param  array{related_kind?: string, related_label?: string, related_display_name?: string, related_purpose?: string, related_source?: string}  $related
     * @return array<string, string|int|float|null>
     */
    public function map(Transaction $t, array $unified, array $related = []): array
    {
        $txnNumber = (string) ($t->transaction_id !== null && $t->transaction_id !== ''
            ? $t->transaction_id
            : 'TXN-'.$t->id);

        $row = [
            'transaction_number' => $txnNumber,
            'module' => $this->moduleTableLabel((string) ($unified['module'] ?? '')),
            'transaction_type' => $this->humanizeTransactionType((string) ($unified['transaction_type'] ?? '')),
            'from_to' => $this->partiesSummary($unified),
            'subscriber_name' => (string) ($unified['subscriber_name'] ?? ''),
            'subscriber_email' => (string) ($unified['subscriber_email'] ?? ''),
            'organization_name' => (string) ($unified['organization_name'] ?? ''),
            'organization_ein' => (string) ($unified['organization_ein'] ?? ''),
            'merchant_name' => (string) ($unified['merchant_name'] ?? ''),
            'campaign_name' => (string) ($unified['campaign_name'] ?? ''),
            'event_name' => (string) ($unified['event_name'] ?? ''),
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
            'related_name' => $this->resolveRelatedName($related, $unified),
            'processed_at' => (string) ($unified['datetime_iso'] ?? ''),
        ];

        return $row;
    }

    /**
     * Matches admin ledger table partiesSummary() in ledger.tsx.
     *
     * @param  array<string, mixed>  $unified
     */
    private function partiesSummary(array $unified): string
    {
        $module = (string) ($unified['module'] ?? '');

        if ($module === 'believe_points') {
            $name = trim((string) (($unified['from_name'] ?? '') !== '' ? $unified['from_name'] : ($unified['from_type'] ?? '')));

            return $name !== '' ? 'Purchaser: '.$name : '';
        }

        $from = trim((string) (($unified['from_name'] ?? '') !== '' ? $unified['from_name'] : ($unified['from_type'] ?? '')));
        $to = trim((string) (($unified['to_name'] ?? '') !== '' ? $unified['to_name'] : ($unified['to_type'] ?? '')));

        if ($from === '' && $to === '') {
            return '';
        }

        if ($from === '') {
            return $to;
        }

        if ($to === '') {
            return $from;
        }

        return $from.' → '.$to;
    }

    /** Same labels as moduleTableLabel() in ledger.tsx. */
    private function moduleTableLabel(string $module): string
    {
        return match ($module) {
            'donation' => 'Donation',
            'fundme' => 'Support a project',
            'campaign' => 'Campaign',
            'believe_points' => 'Believe Points',
            'wallet' => 'Wallet',
            'marketplace' => 'Marketplace',
            'gift_card' => 'Gift card',
            'servicehub' => 'Service Hub',
            'course' => 'Course',
            'merchant_hub' => 'Merchant Hub',
            'organization_subscription' => 'Org sub',
            'supporter_subscription' => 'Supporter sub',
            'merchant_subscription' => 'Merchant sub',
            'payout' => 'Payout',
            'refund' => 'Refund',
            'adjustment' => 'Adjustment',
            default => str_replace('_', ' ', $module),
        };
    }

    private function humanizeTransactionType(string $type): string
    {
        return str_replace('_', ' ', $this->normalizeTransactionType($type));
    }

    /**
     * Same human-readable label as the admin ledger "Related" column.
     *
     * @param  array{related_kind?: string, related_label?: string, related_display_name?: string}  $related
     * @param  array<string, mixed>  $unified
     */
    private function resolveRelatedName(array $related, array $unified): string
    {
        foreach ([
            (string) ($related['related_display_name'] ?? ''),
            (string) ($unified['related_record'] ?? ''),
            (string) ($related['related_label'] ?? ''),
            (string) ($related['related_kind'] ?? ''),
        ] as $candidate) {
            $value = trim($candidate);
            if ($value !== '' && $value !== '—') {
                return $value;
            }
        }

        return '';
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
