<?php

namespace App\Jobs;

use App\Models\ExcelData;
use App\Models\ExcelDataNote;
use App\Models\UploadedFile;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class BulkDeleteExcelDataJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $fileId;
    protected $excelDataIds;
    public $timeout = 3600;
    public $tries = 3;

    public function __construct($fileId, $excelDataIds)
    {
        $this->fileId = $fileId;
        $this->excelDataIds = $excelDataIds;
    }

    public function handle(): void
    {
        try {
            Log::info("Starting bulk deletion of " . count($this->excelDataIds) . " excel data records for file ID: {$this->fileId}");

            DB::beginTransaction();

            // Delete notes first
            ExcelDataNote::whereIn('excel_data_id', $this->excelDataIds)->delete();
            Log::info("Deleted notes for excel data records");

            // Delete excel data in chunks
            $chunkSize = 1000;
            $deletedCount = 0;

            foreach (array_chunk($this->excelDataIds, $chunkSize) as $chunk) {
                $deleted = ExcelData::whereIn('id', $chunk)
                    ->where('file_id', $this->fileId)
                    ->delete();

                $deletedCount += $deleted;
                Log::info("Deleted chunk of {$deleted} excel data records");
            }

            // Update processed rows count
            $remainingCount = ExcelData::where('file_id', $this->fileId)->count();
            UploadedFile::where('id', $this->fileId)->update([
                'processed_rows' => $remainingCount
            ]);

            DB::commit();
            Log::info("Successfully completed bulk deletion. Deleted: {$deletedCount}, Remaining: {$remainingCount}");

        } catch (\Exception $e) {
            DB::rollback();
            Log::error("Failed to bulk delete excel data for file {$this->fileId}: " . $e->getMessage());
            throw $e;
        }
    }
}
