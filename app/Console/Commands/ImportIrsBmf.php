<?php

namespace App\Console\Commands;

use App\Models\ExcelData;
use App\Models\UploadedFile;
use App\Services\ExcelDataTransformer;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ImportIrsBmf extends Command
{
    protected $signature = 'irs:bmf:import
        {--resume : Resume from last saved offset}
        {--chunk=500 : Chunk size for processing}
        {--update-only : Only update existing records, do not insert new ones}
        {--source= : Specific source URL to process}';

    protected $description = 'Stream-import IRS Exempt Organization Business Master File (EO BMF) into excel_data table';

    private array $sources = [
        'https://www.irs.gov/pub/irs-soi/eo1.csv',
        'https://www.irs.gov/pub/irs-soi/eo2.csv',
        'https://www.irs.gov/pub/irs-soi/eo3.csv',
        'https://www.irs.gov/pub/irs-soi/eo4.csv',
    ];

    private $uploadedFile;
    private $excelDataTransformer;
    private $uniqueKeyColumns = ['EIN']; // Define the column(s) that make a record unique

    public function __construct()
    {
        parent::__construct();
        $this->excelDataTransformer = new ExcelDataTransformer();
    }

    public function handle(): int
    {
        $this->info('Starting IRS BMF import into excel_data system');

        $updateOnly = $this->option('update-only');
        $specificSource = $this->option('source');

        if ($updateOnly) {
            $this->info('Running in UPDATE-ONLY mode');
        }

        // Set memory limit higher for large imports
        ini_set('memory_limit', '512M');

        $chunkSize = (int) $this->option('chunk');
        $this->info("Using chunk size: {$chunkSize}");

        // Create uploaded file record
        $this->createUploadedFileRecord();

        $state = $this->loadState();
        $resume = (bool) $this->option('resume');

        $sourcesToProcess = $specificSource ? [$specificSource] : $this->sources;

        foreach ($sourcesToProcess as $index => $url) {
            if ($resume && $index < ($state['source_index'] ?? 0)) {
                $this->line("Skipping already completed source: {$url}");
                continue;
            }

            $this->importSource($url, $index, $state, $chunkSize, $updateOnly);
            $state['source_index'] = $index + 1;
            $state['row_offset'] = 0;
            $this->saveState($state);

            // Force garbage collection between sources
            gc_collect_cycles();
        }

        // Mark upload as completed
        $this->completeUpload();

        $this->info('IRS BMF import completed successfully');
        return self::SUCCESS;
    }

    private function createUploadedFileRecord(): void
    {
        $fileName = 'irs_bmf_' . now()->format('Y-m-d_His') . '.csv';

        $this->uploadedFile = UploadedFile::create([
            'upload_id' => Str::uuid(),
            'file_id' => Str::ulid(),
            'file_name' => $fileName,
            'original_name' => 'IRS_BMF_Combined.csv',
            'file_type' => 'text/csv',
            'file_extension' => 'csv',
            'file_size' => '0', // Will update later
            'total_rows' => 0,
            'processed_rows' => 0,
            'total_chunks' => 0,
            'processed_chunks' => 0,
            'status' => 'processing',
        ]);

        $this->info("Created upload record: {$this->uploadedFile->id}");
    }

    private function completeUpload(): void
    {
        if ($this->uploadedFile) {
            $this->uploadedFile->update([
                'status' => 'completed',
                'processed_rows' => $this->uploadedFile->excelData()->count(),
            ]);
            $this->info("Upload marked as completed: {$this->uploadedFile->id}");
        }
    }

    private function importSource(string $url, int $sourceIndex, array &$state, int $chunkSize, bool $updateOnly): void
    {
        $this->info("Processing source {$sourceIndex}: {$url}");

        try {
            $response = Http::timeout(300)->get($url);

            if (!$response->successful()) {
                $this->error("Failed to download: {$url}");
                return;
            }

            $content = $response->body();
            $lines = explode("\n", $content);

            // Remove empty lines
            $lines = array_filter($lines, function ($line) {
                return !empty(trim($line));
            });

            $header = str_getcsv(array_shift($lines));
            $this->info("Detected columns: " . implode(', ', $header));

            $this->info("Processing " . count($lines) . " records from source {$sourceIndex}");

            $chunk = [];
            $processed = 0;
            $resumeOffset = $state['row_offset'] ?? 0;

            $this->info("resumeOffset " . $state['row_offset']);

            // Store header row (only if we're not resuming and header doesn't exist)
            if ($resumeOffset === 0) {
                $existingHeader = DB::table('excel_data')
                    ->where('file_id', $this->uploadedFile->id)
                    ->exists();

                if (!$existingHeader) {
                    $headerRow = [
                        'file_id' => $this->uploadedFile->id,
                        'row_data' => json_encode($header), // Header values as array
                        'status' => 'complete',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];

                    DB::table('excel_data')->insert($headerRow);
                    $this->uploadedFile->increment('processed_rows');
                    $this->uploadedFile->increment('processed_chunks');
                    $this->info("Added header row for file ID: {$this->uploadedFile->id}");
                }
            }

            foreach ($lines as $i => $line) {
                if ($resumeOffset && $i < $resumeOffset) {
                    continue;
                }

                $rowData = str_getcsv($line);
                if (count($rowData) !== count($header)) {
                    $this->warn("Skipping malformed row at line {$i}: " . substr($line, 0, 100) . "...");
                    continue; // Skip malformed rows
                }

                // Add data row (just the values as array)
                $chunk[] = [
                    'file_id' => $this->uploadedFile->id,
                    'row_data' => json_encode($rowData), // Data values as array
                    'status' => 'complete',
                    'created_at' => now(),
                    'updated_at' => now(),
                ];

                if (count($chunk) >= $chunkSize) {
                    $this->processChunk($chunk, $header, $updateOnly);
                    $processed += count($chunk);
                    $state['row_offset'] = $i + 1;
                    $this->saveState($state);
                    $this->line("Processed {$processed} data rows from source {$sourceIndex}");

                    // Update uploaded file progress
                    $this->uploadedFile->increment('processed_rows', count($chunk));
                    $this->uploadedFile->increment('processed_chunks');

                    $chunk = [];

                    // Force garbage collection every few chunks
                    if ($processed % ($chunkSize * 10) === 0) {
                        gc_collect_cycles();
                    }
                }
            }

            if (!empty($chunk)) {
                $this->processChunk($chunk, $header, $updateOnly);
                $processed += count($chunk);
                $this->uploadedFile->increment('processed_rows', count($chunk));
                $this->uploadedFile->increment('processed_chunks');
                $this->line("Processed {$processed} data rows from source {$sourceIndex}");
            }

            $this->info("Completed processing source {$sourceIndex}: {$processed} data records");

        } catch (\Exception $e) {
            $this->error("Error processing source {$url}: " . $e->getMessage());
            Log::error("IRS BMF Import Error: " . $e->getMessage(), [
                'url' => $url,
                'source_index' => $sourceIndex
            ]);
        }
    }

    private function processChunk(array $rows, array $header, bool $updateOnly): void
    {
        try {
            foreach ($rows as $row) {
                $rowData = json_decode($row['row_data'], true);

                // Create a unique identifier for this record
                $uniqueKeyValues = [];
                foreach ($this->uniqueKeyColumns as $column) {
                    $columnIndex = array_search($column, $header);
                    if ($columnIndex !== false && isset($rowData[$columnIndex])) {
                        $uniqueKeyValues[$column] = $rowData[$columnIndex];
                    }
                }

                // If we have a unique identifier, try to find existing record
                if (!empty($uniqueKeyValues)) {
                    $existingRecord = ExcelData::where('file_id', $row['file_id'])
                        ->where(function ($query) use ($uniqueKeyValues, $header) {
                            foreach ($uniqueKeyValues as $column => $value) {
                                $columnIndex = array_search($column, $header);
                                $query->whereRaw("JSON_EXTRACT(row_data, '$[$columnIndex]') = ?", [$value]);
                            }
                        })
                        ->first();

                    if ($existingRecord) {
                        // Update existing record
                        $existingRecord->update([
                            'row_data' => $row['row_data'],
                            'updated_at' => now()
                        ]);
                    } else if (!$updateOnly) {
                        // Insert new record if not in update-only mode
                        DB::table('excel_data')->insert($row);
                    }
                } else if (!$updateOnly) {
                    // If no unique identifier, just insert (unless update-only mode)
                    DB::table('excel_data')->insert($row);
                }
            }
        } catch (\Exception $e) {
            $this->error("Error processing chunk: " . $e->getMessage());

            // Fallback to individual processing
            foreach ($rows as $row) {
                try {
                    DB::table('excel_data')->insert($row);
                } catch (\Exception $insertError) {
                    $this->error("Failed to insert row: " . $insertError->getMessage());
                    Log::error("Failed to insert IRS BMF row", [
                        'row_data' => $row['row_data'],
                        'error' => $insertError->getMessage()
                    ]);
                }
            }
        }
    }

    private function statePath(): string
    {
        return storage_path('app/irs_bmf_import_state.json');
    }

    private function loadState(): array
    {
        $path = $this->statePath();
        if (!file_exists($path)) {
            return ['source_index' => 0, 'row_offset' => 0];
        }
        $json = file_get_contents($path);
        $data = json_decode($json, true);
        return is_array($data) ? $data : ['source_index' => 0, 'row_offset' => 0];
    }

    private function saveState(array $state): void
    {
        file_put_contents($this->statePath(), json_encode($state));
    }
}
