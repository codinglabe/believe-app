<?php

namespace App\Exports;

use App\Services\OrganizationSupporterLedgerService;
use Generator;
use Maatwebsite\Excel\Concerns\FromGenerator;
use Maatwebsite\Excel\Concerns\WithHeadings;

/**
 * @implements FromGenerator<int, list<string|int|float>>
 */
final class OrganizationSupporterLedgerExport implements FromGenerator, WithHeadings
{
    /**
     * @param  Generator<int, list<string|int|float>>  $rows
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
        return OrganizationSupporterLedgerService::HEADERS;
    }
}
