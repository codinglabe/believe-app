<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Exception;

class ExportExcelDataJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $state;
    protected $filename;
    protected $format;
    protected $jobId;

    public $timeout = 7200; // 2 hours timeout
    public $tries = 1;

    public function __construct($state, $filename, $format = 'csv', $jobId = null)
    {
        $this->state = $state;
        $this->filename = $filename;
        $this->format = $format;
        $this->jobId = $jobId;
    }

    public function handle()
    {
        try {
            Log::info("[v0] Starting native PHP export job", [
                'state' => $this->state,
                'filename' => $this->filename,
                'format' => $this->format,
                'jobId' => $this->jobId
            ]);

            $exportsPath = storage_path('app/public/exports');
            if (!file_exists($exportsPath)) {
                mkdir($exportsPath, 0755, true);
                Log::info("[v0] Created exports directory at: " . $exportsPath);
            }

            $fullFilePath = $exportsPath . '/' . $this->filename;

            $file = fopen($fullFilePath, 'w');
            if (!$file) {
                throw new Exception("Could not create export file: " . $fullFilePath);
            }

            $headers = [
                'ID',
                'File ID',
                'EIN',
                'Name',
                'State',
                'City',
                'ZIP',
                'NTEE Code',
                'Sort Name',
                'Status',
                'Created At',
                'Updated At'
            ];

            fputcsv($file, $headers);
            Log::info("[v0] CSV headers written");

            $query = DB::table('excel_data')
                ->select([
                    'id',
                    'file_id',
                    'ein',
                    'name_virtual as name',
                    'state_virtual as state',
                    'city_virtual as city',
                    'zip_virtual as zip',
                    'ntee_code_virtual as ntee_code',
                    'sort_name_virtual as sort_name',
                    'status',
                    'created_at',
                    'updated_at'
                ])
                ->orderBy('id');

            if ($this->state) {
                $query->where('state_virtual', $this->state);
            }

            $totalRecords = $query->count();
            Log::info("[v0] Total records to export: " . $totalRecords);

            $processedRecords = 0;
            $chunkSize = 1000;

            $query->chunk($chunkSize, function ($records) use ($file, &$processedRecords) {
                foreach ($records as $record) {
                    $row = [
                        $record->id,
                        $record->file_id,
                        $record->ein,
                        $record->name,
                        $record->state,
                        $record->city,
                        $record->zip,
                        $record->ntee_code,
                        $record->sort_name,
                        $record->status,
                        $record->created_at,
                        $record->updated_at
                    ];

                    fputcsv($file, $row);
                    $processedRecords++;
                }

                Log::info("[v0] Processed " . $processedRecords . " records");
            });

            fclose($file);

            if (file_exists($fullFilePath)) {
                $fileSize = filesize($fullFilePath);
                Log::info("[v0] Export completed successfully", [
                    'filePath' => $fullFilePath,
                    'fileSize' => $fileSize . ' bytes',
                    'totalRecords' => $processedRecords
                ]);
            } else {
                throw new Exception("Export file was not created");
            }

        } catch (Exception $e) {
            Log::error("[v0] Export job failed", [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            $this->handleJobFailure($e);
            throw $e;
        }
    }

    protected function handleJobFailure(Exception $e)
    {
        try {
            $errorPath = 'public/exports/errors/' . $this->filename . '.error';
            Storage::put($errorPath, $e->getMessage() . "\n\n" . $e->getTraceAsString());
        } catch (Exception $storageException) {
            Log::error("[v0] Failed to store error message", ['error' => $storageException->getMessage()]);
        }
    }
}
