<?php

namespace App\Exports;

use Generator;
use Maatwebsite\Excel\Concerns\FromGenerator;
use Maatwebsite\Excel\Concerns\WithHeadings;

/**
 * @implements FromGenerator<int, list<string|int|null>>
 */
final class PushNotificationLogExport implements FromGenerator, WithHeadings
{
    /**
     * @param  Generator<int, list<string|int|null>>  $rows
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
        return [
            'ID',
            'Date',
            'Organization',
            'Module',
            'Title',
            'Audience',
            'Recipient Count',
            'Sent',
            'Delivered',
            'Opened',
            'Failed',
            'Status',
            'Created By',
            'Deep Link',
        ];
    }
}
