<?php

namespace App\Console\Commands;

use App\Jobs\ProcessIrsBmfSource;
use App\Models\UploadedFile;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

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

    private $uploadedFile;

    public function handle(): int
    {
        // Check if another import is already running
        $runningImport = UploadedFile::where('original_name', 'IRS_BMF_Combined.csv')
            ->whereIn('status', ['queued', 'processing'])
            ->first();

        if ($runningImport && !$this->option('force')) {
            $this->error("Another import is already running (ID: {$runningImport->id}, Status: {$runningImport->status}). Use --force to run anyway.");
            return self::FAILURE;
        }

        $this->info('Starting queued IRS BMF import');

        $updateOnly = (bool) $this->option('update-only');
        $specificSource = $this->option('source');
        $chunkSize = (int) $this->option('chunk');

        // Create uploaded file record
        $this->createUploadedFileRecord();

        $sourcesToProcess = $specificSource ? [$specificSource] : $this->sources;

        $this->info("Dispatching " . count($sourcesToProcess) . " source processing jobs");

        foreach ($sourcesToProcess as $index => $url) {
            ProcessIrsBmfSource::dispatch(
                $url,
                $this->uploadedFile->id,
                $updateOnly,
                $chunkSize,
                $index
            )->onQueue('irs-import');

            $this->info("Dispatched job for source {$index}: {$url}");
        }

        $this->info("All jobs dispatched. Run queue workers to process: php artisan queue:work --queue=irs-import");
        $this->info("Upload ID: {$this->uploadedFile->id}");
        $this->info("Monitor progress: php artisan irs:bmf:monitor {$this->uploadedFile->id}");

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
