<?php

namespace App\Console\Commands;

use App\Jobs\ProcessIrsBmfSource;
use App\Models\UploadedFile;
use Illuminate\Bus\Batch;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

class ImportIrsBmf extends Command
{
    protected $signature = 'irs:bmf:import
        {--chunk=500 : Chunk size for processing}
        {--update-only : Only update existing records, do not insert new ones}
        {--source= : Specific source URL to process}
        {--force : Force import even if another is running}';

    protected $description = 'Queue-based import of IRS Exempt Organization Business Master File';

    private array $sources = [
        'https://www.irs.gov/pub/irs-soi/eo1.csv',
        'https://www.irs.gov/pub/irs-soi/eo2.csv',
        'https://www.irs.gov/pub/irs-soi/eo3.csv',
        'https://www.irs.gov/pub/irs-soi/eo4.csv',
    ];

    private UploadedFile $uploadedFile;

    public function handle(): int
    {
        $runningImport = UploadedFile::where('original_name', 'IRS_BMF_Combined.csv')
            ->whereIn('status', ['queued', 'processing'])
            ->first();

        if ($runningImport && ! $this->option('force')) {
            $this->error("Another import is already running (ID: {$runningImport->id}, Status: {$runningImport->status}). Use --force to run anyway.");

            return self::FAILURE;
        }

        $this->info('Starting queued IRS BMF import');

        $updateOnly = (bool) $this->option('update-only');
        $specificSource = $this->option('source');
        $chunkSize = (int) $this->option('chunk');

        $this->createUploadedFileRecord();

        $sourcesToProcess = $specificSource ? [$specificSource] : $this->sources;
        $fileId = $this->uploadedFile->id;

        $jobs = [];
        foreach ($sourcesToProcess as $index => $url) {
            $jobs[] = new ProcessIrsBmfSource($url, $fileId, $updateOnly, $chunkSize, $index);
        }

        $this->info('Dispatching '.count($jobs).' source processing jobs as a batch');

        $batch = Bus::batch($jobs)
            ->name("IRS BMF Import #{$fileId}")
            ->then(function (Batch $batch) use ($fileId) {
                UploadedFile::where('id', $fileId)->update(['status' => 'completed']);
                Log::info("IRS BMF import batch completed for upload ID: {$fileId}");
            })
            ->catch(function (Batch $batch, Throwable $e) use ($fileId) {
                UploadedFile::where('id', $fileId)->update(['status' => 'failed']);
                Log::error("IRS BMF import batch failed for upload ID: {$fileId}: ".$e->getMessage());
            })
            ->onQueue('irs-import')
            ->dispatch();

        $this->uploadedFile->update([
            'batch_id' => $batch->id,
            'status' => 'processing',
        ]);

        foreach ($sourcesToProcess as $index => $url) {
            $this->info("Queued source {$index}: {$url}");
        }

        $this->info('Batch dispatched. Ensure a queue worker is running: php artisan queue:work --queue=irs-import');
        $this->info("Upload ID: {$fileId}");
        $this->info("Batch ID: {$batch->id}");
        $this->info("Monitor progress: php artisan irs:bmf:monitor {$fileId}");

        return self::SUCCESS;
    }

    private function createUploadedFileRecord(): void
    {
        $fileName = 'irs_bmf_'.now()->format('Y-m-d_His').'.csv';

        $this->uploadedFile = UploadedFile::create([
            'upload_id' => Str::uuid(),
            'file_id' => Str::ulid(),
            'file_name' => $fileName,
            'original_name' => 'IRS_BMF_Combined.csv',
            'file_type' => 'text/csv',
            'file_extension' => 'csv',
            'file_size' => '0',
            'total_rows' => 0,
            'processed_rows' => 0,
            'total_chunks' => 0,
            'processed_chunks' => 0,
            'status' => 'queued',
        ]);

        $this->info("Created upload record: {$this->uploadedFile->id}");
    }
}
