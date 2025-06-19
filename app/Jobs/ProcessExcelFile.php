<?php

namespace App\Jobs;

use App\Models\ExcelData;
use App\Models\UploadedFile;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use PhpOffice\PhpSpreadsheet\IOFactory;

class ProcessExcelFile implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $fileId;
    protected $filePath;
    public $timeout = 7200; // 2 hours
    public $tries = 3;

    public function __construct($fileId, $filePath)
    {
        $this->fileId = $fileId;
        $this->filePath = $filePath;
    }

    public function handle(): void
    {
        $uploadedFile = UploadedFile::find($this->fileId);
        if (!$uploadedFile) {
            Log::error("Uploaded file not found: {$this->fileId}");
            return;
        }

        try {
            Log::info("Starting Excel processing for file ID: {$this->fileId}");

            $uploadedFile->update(['status' => 'processing']);

            $fullPath = storage_path('app/public/' . $this->filePath);

            if (!file_exists($fullPath)) {
                throw new \Exception("File not found at path: {$fullPath}");
            }

            // Determine file type and process accordingly
            $fileExtension = strtolower(pathinfo($fullPath, PATHINFO_EXTENSION));

            if ($fileExtension === 'csv') {
                $this->processCSV($fullPath, $uploadedFile);
            } else {
                $this->processExcel($fullPath, $uploadedFile);
            }

            $uploadedFile->update(['status' => 'completed']);
            Log::info("File processing completed successfully for file ID: {$this->fileId}");

            // Clean up
            if (file_exists($fullPath)) {
                unlink($fullPath);
            }

        } catch (\Exception $e) {
            Log::error('Excel processing failed: ' . $e->getMessage());
            $uploadedFile->update(['status' => 'failed']);
            throw $e;
        }
    }

    private function processCSV($filePath, $uploadedFile)
    {
        $handle = fopen($filePath, 'r');
        if (!$handle) {
            throw new \Exception("Cannot open CSV file");
        }

        $processedRows = 0;
        $batchSize = 1000;
        $dataToInsert = [];

        try {
            while (($row = fgetcsv($handle)) !== false) {
                if (!empty(array_filter($row))) {
                    $dataToInsert[] = [
                        'file_id' => $this->fileId,
                        'row_data' => json_encode($row),
                        'created_at' => now(),
                        'updated_at' => now()
                    ];

                    if (count($dataToInsert) >= $batchSize) {
                        $this->insertBatch($dataToInsert);
                        $processedRows += count($dataToInsert);
                        $dataToInsert = [];

                        $uploadedFile->update(['processed_rows' => $processedRows]);
                        Log::info("Processed {$processedRows} rows");
                    }
                }
            }

            // Insert remaining
            if (!empty($dataToInsert)) {
                $this->insertBatch($dataToInsert);
                $processedRows += count($dataToInsert);
                $uploadedFile->update(['processed_rows' => $processedRows]);
            }

        } finally {
            fclose($handle);
        }

        $uploadedFile->update(['total_rows' => $processedRows]);
    }

    private function processExcel($filePath, $uploadedFile)
    {
        $reader = IOFactory::createReaderForFile($filePath);
        $reader->setReadDataOnly(true);
        $spreadsheet = $reader->load($filePath);
        $worksheet = $spreadsheet->getActiveSheet();

        $rows = $worksheet->toArray();
        $totalRows = count($rows);

        $uploadedFile->update(['total_rows' => $totalRows]);
        Log::info("Excel file has {$totalRows} total rows");

        $processedRows = 0;
        $batchSize = 500;
        $dataToInsert = [];

        foreach ($rows as $row) {
            if (!empty(array_filter($row))) {
                $dataToInsert[] = [
                    'file_id' => $this->fileId,
                    'row_data' => json_encode($row),
                    'created_at' => now(),
                    'updated_at' => now()
                ];

                if (count($dataToInsert) >= $batchSize) {
                    $this->insertBatch($dataToInsert);
                    $processedRows += count($dataToInsert);
                    $dataToInsert = [];

                    $uploadedFile->update(['processed_rows' => $processedRows]);

                    if ($processedRows % 5000 === 0) {
                        Log::info("Processed {$processedRows}/{$totalRows} rows");
                        gc_collect_cycles(); // Memory cleanup
                    }
                }
            }
        }

        // Insert remaining
        if (!empty($dataToInsert)) {
            $this->insertBatch($dataToInsert);
            $processedRows += count($dataToInsert);
            $uploadedFile->update(['processed_rows' => $processedRows]);
        }

        $spreadsheet->disconnectWorksheets();
        unset($spreadsheet);
    }

    private function insertBatch($dataToInsert)
    {
        try {
            DB::beginTransaction();

            foreach (array_chunk($dataToInsert, 250) as $chunk) {
                DB::table('excel_data')->insert($chunk);
            }

            DB::commit();
        } catch (\Exception $e) {
            DB::rollback();
            throw $e;
        }
    }
}
