<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CleanExcelDataDuplicates extends Command
{
    protected $signature = 'excel-data:clean-duplicates';
    protected $description = 'Clean up duplicate records in excel_data table based on EIN';

    public function handle(): int
    {
        $this->info('Starting duplicate cleanup...');

        // Find duplicates based on EIN (excluding headers and null EINs)
        $duplicates = DB::table('excel_data')
            ->select('ein', DB::raw('COUNT(*) as count'))
            ->whereNotNull('ein')
            ->where('ein', '!=', 'EIN')
            ->groupBy('ein')
            ->having('count', '>', 1)
            ->get();

        $this->info("Found {$duplicates->count()} EINs with duplicates");

        $totalDeleted = 0;

        foreach ($duplicates as $duplicate) {
            // Keep the most recent record for each EIN
            $recordsToKeep = DB::table('excel_data')
                ->where('ein', $duplicate->ein)
                ->orderBy('updated_at', 'desc')
                ->first();

            if ($recordsToKeep) {
                $deleted = DB::table('excel_data')
                    ->where('ein', $duplicate->ein)
                    ->where('id', '!=', $recordsToKeep->id)
                    ->delete();

                $totalDeleted += $deleted;
                $this->info("Cleaned {$deleted} duplicates for EIN: {$duplicate->ein}");
            }
        }

        $this->info("Duplicate cleanup completed. Total records deleted: {$totalDeleted}");

        return self::SUCCESS;
    }
}
