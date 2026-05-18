<?php

namespace App\Jobs;

use App\Models\UploadedFile;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ProcessIrsBmfSource implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $timeout = 10800; // 3 hours

    private int $totalInsertedCount = 0; // Track total inserted records
    private ?int $storeLimit = null; // Limit from .env file

    public function __construct(
        private string $url,
        private string $fileId,
        private bool $updateOnly = false,
        private int $chunkSize = 100,
        private int $sourceIndex = 0
    ) {
        // Get store limit from .env file (only if set to 5000)
        $envLimit = env('IRS_BMF_STORE_LIMIT');
        if ($envLimit && (int)$envLimit === 5000) {
            $this->storeLimit = 5000;
        }
    }

    public function handle(): void
    {
        ini_set('memory_limit', '1024M');
        set_time_limit(10800);

        try {
            $uploadedFile = UploadedFile::findOrFail($this->fileId);

            if (in_array($uploadedFile->status, ['cancelled', 'failed', 'completed'])) {
                Log::info("Upload {$uploadedFile->status}, skipping");
                return;
            }

            $uploadedFile->update(['status' => 'processing']);

            // Download the file
            $content = $this->downloadFile($this->url);
            if (!$content) {
                throw new \Exception("Failed to download file from {$this->url}");
            }

            $lines = explode("\n", $content);
            $lines = array_filter($lines, fn($line) => !empty(trim($line)));

            if (count($lines) < 2) {
                throw new \Exception("No data found in file");
            }

            $header = str_getcsv(array_shift($lines));
            $einIndex = array_search('EIN', $header);

            if ($einIndex === false) {
                throw new \Exception("EIN column not found in CSV header");
            }

            // Add header row for this file if it doesn't exist
            $headerAdded = $this->addHeaderRow($header, $this->fileId);

            // Count total data rows (excluding header)
            $totalDataRows = count($lines);

            // Update total rows in uploaded_files (data rows + header)
            $uploadedFile->update([
                'total_rows' => $totalDataRows + ($headerAdded ? 1 : 0),
                'total_chunks' => ceil($totalDataRows / $this->chunkSize)
            ]);

            Log::info("Processing source {$this->sourceIndex} with {$totalDataRows} data records");

            // Process in chunks
            $chunks = array_chunk($lines, $this->chunkSize);
            $totalProcessed = 0;
            $processedChunks = 0;
            $totalRecordsProcessed = 0; // Total records that were processed (including already existing)
            $limitReached = false;

            foreach ($chunks as $chunkIndex => $chunkLines) {
                // Check if limit is reached before processing chunk
                if ($this->storeLimit !== null && $this->totalInsertedCount >= $this->storeLimit) {
                    $limitReached = true;
                    Log::info("Store limit of {$this->storeLimit} reached. Skipping remaining chunks for inserts (updates will continue).");
                    break;
                }

                $result = $this->processChunk($chunkLines, $header, $einIndex, $this->fileId, $this->updateOnly, $limitReached);
                $processed = $result['processed'];
                $recordsInChunk = $result['records_in_chunk'];
                $insertedInChunk = $result['inserted'] ?? 0;

                $totalProcessed += $processed;
                $totalRecordsProcessed += $recordsInChunk;
                $this->totalInsertedCount += $insertedInChunk;
                $processedChunks++;

                // Update progress in uploaded_files - count ALL records processed, even if no changes
                $uploadedFile->update([
                    'processed_rows' => $totalRecordsProcessed,
                    'processed_chunks' => $processedChunks
                ]);

                Log::info("Processed chunk {$chunkIndex}, {$processed} updated/inserted out of {$recordsInChunk} records. Total: {$totalRecordsProcessed}/{$totalDataRows}. Inserted: {$this->totalInsertedCount}" . ($this->storeLimit ? "/{$this->storeLimit}" : ""));

                // Check if limit reached after this chunk
                if ($this->storeLimit !== null && $this->totalInsertedCount >= $this->storeLimit) {
                    $limitReached = true;
                    Log::info("Store limit of {$this->storeLimit} reached after chunk {$chunkIndex}.");
                }

                // Clean memory periodically
                if ($chunkIndex % 10 === 0) {
                    gc_collect_cycles();
                }
            }

            // Check if all rows are processed and update status to completed
            $this->checkAndUpdateCompletionStatus($uploadedFile, $totalDataRows, $totalRecordsProcessed);

            Log::info("Completed processing source {$this->sourceIndex}. Processed: {$totalRecordsProcessed}/{$totalDataRows} records");

        } catch (\Exception $e) {
            Log::error("ProcessIrsBmfSource failed: " . $e->getMessage());

            // Update status to failed
            if (isset($uploadedFile)) {
                $uploadedFile->update(['status' => 'failed']);
            }

            throw $e;
        }
    }

    private function checkAndUpdateCompletionStatus(UploadedFile $uploadedFile, int $totalDataRows, int $totalRecordsProcessed): void
    {
        // Refresh the model to get latest values
        $uploadedFile->refresh();

        // Check if all data rows are processed (even if no changes were made)
        if ($totalRecordsProcessed >= $totalDataRows) {
            $uploadedFile->update([
                'status' => 'completed',
                'processed_rows' => $totalRecordsProcessed,
                'processed_chunks' => $uploadedFile->total_chunks
            ]);
            Log::info("All data rows processed for file ID: {$uploadedFile->id}. Status updated to completed.");
        } else {
            Log::warning("Processing incomplete for file ID: {$uploadedFile->id}. Processed: {$totalRecordsProcessed}, Expected: {$totalDataRows}");
        }
    }

    private function downloadFile(string $url): ?string
    {
        try {
            $response = Http::timeout(300)
                ->retry(3, 5000)
                ->withHeaders([
                    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                ])
                ->get($url);

            return $response->successful() ? $response->body() : null;
        } catch (\Exception $e) {
            Log::error("Download failed: " . $e->getMessage());
            return null;
        }
    }

    private function addHeaderRow(array $header, string $fileId): bool
    {
        // Check if header already exists for this file
        $existingHeader = DB::table('excel_data')
            ->where('file_id', $fileId)
            ->where('ein', 'EIN')
            ->exists();

        if (!$existingHeader) {
            DB::table('excel_data')->insert([
                'file_id' => $fileId,
                'row_data' => json_encode($header),
                'ein' => 'EIN',
                'status' => 'complete',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            Log::info("Added header row for file ID: {$fileId}");
            return true;
        }

        return false;
    }

    private function processChunk(array $lines, array $header, int $einIndex, string $fileId, bool $updateOnly, bool &$limitReached = false): array
    {
        $processed = 0; // Count of records that were actually updated/inserted
        $recordsInChunk = 0; // Total records processed in this chunk (including unchanged)
        $inserted = 0; // Count of records inserted (not updated)
        $rowsToInsert = [];
        $rowsToUpdate = [];

        foreach ($lines as $line) {
            $recordsInChunk++;

            $rowData = str_getcsv($line);

            if (count($rowData) !== count($header)) {
                Log::warning("Skipping malformed row: " . substr($line, 0, 100));
                continue;
            }

            $einValue = isset($rowData[$einIndex]) ? (string) $rowData[$einIndex] : null;

            // Note: Virtual columns (name_virtual, state_virtual, city_virtual, zip_virtual, ntee_code_virtual, sort_name_virtual)
            // are automatically generated by MySQL from the row_data JSON column, so we don't need to set them manually

            $row = [
                'file_id' => $fileId,
                'row_data' => json_encode($rowData),
                'ein' => $einValue,
                // Note: Virtual columns (name_virtual, state_virtual, city_virtual, zip_virtual, ntee_code_virtual, sort_name_virtual) 
                // are generated automatically by MySQL and should not be included in inserts
                'status' => 'complete',
                'created_at' => now(),
                'updated_at' => now(),
            ];

            if (!empty($einValue)) {
                $existing = DB::table('excel_data')
                    ->where('ein', $einValue)
                    ->where('ein', '!=', 'EIN')
                    ->first();

                if ($existing) {
                    $existingData = json_decode($existing->row_data, true);
                    if ($existingData !== $rowData) {
                        $rowsToUpdate[$existing->id] = [
                            'row_data' => json_encode($rowData),
                            // Note: Virtual columns are generated automatically by MySQL and should not be included in updates
                            'updated_at' => now()
                        ];
                        $processed++;
                    }
                    // Even if no update, we still count this as a processed record
                } else if (!$updateOnly && !$limitReached) {
                    // Check if we've reached the limit before adding to insert array
                    if ($this->storeLimit !== null && ($this->totalInsertedCount + count($rowsToInsert)) >= $this->storeLimit) {
                        $limitReached = true;
                        Log::info("Store limit reached. Skipping remaining inserts in this chunk.");
                        break;
                    }
                    $rowsToInsert[] = $row;
                    $processed++;
                    $inserted++;
                }
            } else if (!$updateOnly && !$limitReached) {
                // Check if we've reached the limit before adding to insert array
                if ($this->storeLimit !== null && ($this->totalInsertedCount + count($rowsToInsert)) >= $this->storeLimit) {
                    $limitReached = true;
                    Log::info("Store limit reached. Skipping remaining inserts in this chunk.");
                    break;
                }
                $rowsToInsert[] = $row;
                $processed++;
                $inserted++;
            }
        }

        // Bulk operations
        if (!empty($rowsToInsert)) {
            DB::table('excel_data')->insert($rowsToInsert);
        }

        if (!empty($rowsToUpdate)) {
            foreach ($rowsToUpdate as $id => $data) {
                DB::table('excel_data')
                    ->where('id', $id)
                    ->update($data);
            }
        }

        return [
            'processed' => $processed,
            'records_in_chunk' => $recordsInChunk,
            'inserted' => $inserted
        ];
    }

    public function failed(\Exception $exception): void
    {
        Log::error("ProcessIrsBmfSource job failed: " . $exception->getMessage());

        try {
            $uploadedFile = UploadedFile::find($this->fileId);
            if ($uploadedFile) {
                $uploadedFile->update(['status' => 'failed']);
            }
        } catch (\Exception $e) {
            Log::error("Failed to update uploaded file status: " . $e->getMessage());
        }
    }
}
