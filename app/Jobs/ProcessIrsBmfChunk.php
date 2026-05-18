<?php

namespace App\Jobs;

use App\Models\ExcelData;
use App\Models\UploadedFile;
use Illuminate\Bus\Batchable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ProcessIrsBmfChunk implements ShouldQueue
{
    use Batchable, Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $timeout = 1200;
    public $maxExceptions = 3;

    public function __construct(
        private array $rows,
        private array $header,
        private string $fileId,
        private bool $updateOnly = false
    ) {
    }

    public function handle(): void
    {
        if ($this->batch() && $this->batch()->cancelled()) {
            return;
        }

        try {
            $einIndex = array_search('EIN', $this->header);

            if ($einIndex === false) {
                throw new \Exception("EIN column not found in header");
            }

            foreach ($this->rows as $row) {
                $rowData = json_decode($row['row_data'], true);

                // Skip header rows
                if (isset($rowData[0]) && $rowData[0] === 'EIN') {
                    continue;
                }

                // Get EIN value
                $einValue = isset($rowData[$einIndex]) ? (string) $rowData[$einIndex] : null;

                if (!empty($einValue)) {
                    $existingRecord = ExcelData::whereRaw("JSON_UNQUOTE(JSON_EXTRACT(row_data, '$[$einIndex]')) = ?", [$einValue])
                        ->whereRaw("JSON_EXTRACT(row_data, '$[0]') != 'EIN'")
                        ->first();

                    if ($existingRecord) {
                        $existingData = $existingRecord->row_data;
                        if ($existingData !== $rowData) {
                            $existingRecord->update([
                                'row_data' => $row['row_data'],
                                'updated_at' => now()
                            ]);
                        }
                    } else if (!$this->updateOnly) {
                        DB::table('excel_data')->insert($row);
                    }
                } else if (!$this->updateOnly) {
                    DB::table('excel_data')->insert($row);
                }
            }

            // Update progress
            UploadedFile::where('id', $this->fileId)
                ->increment('processed_rows', count($this->rows));

        } catch (\Exception $e) {
            Log::error("ProcessIrsBmfChunk failed: " . $e->getMessage(), [
                'file_id' => $this->fileId,
                'chunk_size' => count($this->rows)
            ]);

            // Fallback: insert all rows without processing
            foreach ($this->rows as $row) {
                try {
                    $rowData = json_decode($row['row_data'], true);
                    if (isset($rowData[0]) && $rowData[0] === 'EIN') {
                        continue;
                    }
                    DB::table('excel_data')->insert($row);
                } catch (\Exception $insertError) {
                    Log::error("Failed to insert IRS BMF row in fallback", [
                        'error' => $insertError->getMessage()
                    ]);
                }
            }
        }
    }

    public function failed(\Exception $exception): void
    {
        Log::error("ProcessIrsBmfChunk job failed permanently", [
            'error' => $exception->getMessage(),
            'file_id' => $this->fileId
        ]);
    }
}
