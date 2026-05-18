<?php

namespace App\Exports;

use App\Services\Admin\UnifiedLedgerFlatFileMapper;
use Generator;
use Maatwebsite\Excel\Concerns\FromGenerator;
use Maatwebsite\Excel\Concerns\WithHeadings;

/**
 * Streams flat ledger rows (client column set) into an XLSX via maatwebsite/excel.
 *
 * @implements FromGenerator<int, list<string|int|float|null>>
 */
final class LedgerFlatFileExport implements FromGenerator, WithHeadings
{
    /**
     * @param  Generator<int, list<string|int|float|null>>  $rows
     */
    public function __construct(
        private Generator $rows,
    ) {}

    public function generator(): Generator
    {
        return $this->rows;
    }

    /**
     * @return list<string>
     */
    public function headings(): array
    {
        return UnifiedLedgerFlatFileMapper::CSV_HEADERS;
    }
}
