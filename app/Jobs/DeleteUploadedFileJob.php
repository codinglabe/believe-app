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
use Illuminate\Support\Facades\Storage;

class DeleteUploadedFileJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $fileId;
    public $timeout = 3600; // 1 hour
    public $tries = 3;

    public function __construct($fileId)
    {
        $this->fileId = $fileId;
    }

    public function handle(): void
    {
        try {
            Log::info("Starting deletion process for uploaded file ID: {$this->fileId}");

            // Get the file record first to check if it exists
            $uploadedFile = UploadedFile::find($this->fileId);

            if (!$uploadedFile) {
                Log::info("File ID {$this->fileId} already deleted, skipping job");
                return;
            }

            // Update progress to show deletion has started
            $uploadedFile->update([
                'processed_rows' => 0,
                'total_rows' => 100, // Use this for progress calculation
            ]);

            DB::beginTransaction();

            // Get all excel data IDs for this file
            $excelDataIds = ExcelData::where('file_id', $this->fileId)->pluck('id');
            $totalRecords = count($excelDataIds);
            $processedRecords = 0;

            if ($excelDataIds->isNotEmpty()) {
                // Delete notes in chunks
                $chunkSize = 1000;
                foreach ($excelDataIds->chunk($chunkSize) as $chunk) {
                    ExcelDataNote::whereIn('excel_data_id', $chunk)->delete();
                    Log::info("Deleted notes for chunk of " . count($chunk) . " excel data records");

                    // Update progress
                    $processedRecords += count($chunk);
                    $progress = min(50, ($processedRecords / $totalRecords) * 50); // First 50% for notes
                    $uploadedFile->update(['processed_rows' => $progress]);
                }

                // Reset for excel data deletion
                $processedRecords = 0;

                // Delete excel data in chunks
                foreach ($excelDataIds->chunk($chunkSize) as $chunk) {
                    ExcelData::whereIn('id', $chunk)->delete();
                    Log::info("Deleted chunk of " . count($chunk) . " excel data records");

                    // Update progress
                    $processedRecords += count($chunk);
                    $progress = 50 + min(40, ($processedRecords / $totalRecords) * 40); // Next 40% for data
                    $uploadedFile->update(['processed_rows' => $progress]);
                }
            }

            // Delete physical file if exists
            if ($uploadedFile->path && Storage::disk('public')->exists($uploadedFile->path)) {
                Storage::disk('public')->delete($uploadedFile->path);
                Log::info("Deleted physical file: {$uploadedFile->path}");
            }

            // Update to 95% before final deletion
            $uploadedFile->update(['processed_rows' => 95]);

            // Delete the uploaded file record
            $uploadedFile->delete();
            Log::info("Deleted uploaded file record: {$this->fileId}");

            DB::commit();
            Log::info("Successfully completed deletion process for uploaded file ID: {$this->fileId}");

        } catch (\Exception $e) {
            DB::rollback();
            Log::error("Failed to delete uploaded file {$this->fileId}: " . $e->getMessage());

            // Try to update status to failed if the file still exists
            try {
                $file = UploadedFile::find($this->fileId);
                if ($file) {
                    $file->update(['status' => 'failed']);
                }
            } catch (\Exception $innerEx) {
                Log::error("Failed to update status for file {$this->fileId}: " . $innerEx->getMessage());
            }

            throw $e;
        }
    }
}
