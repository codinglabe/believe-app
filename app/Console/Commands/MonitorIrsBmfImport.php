<?php

namespace App\Console\Commands;

use App\Models\UploadedFile;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Bus;

class MonitorIrsBmfImport extends Command
{
    protected $signature = 'irs:bmf:monitor {uploadId? : The uploaded_files ID to monitor}';

    protected $description = 'Show progress for an IRS BMF import (latest import if no ID given)';

    public function handle(): int
    {
        $uploadId = $this->argument('uploadId');

        $upload = $uploadId
            ? UploadedFile::find($uploadId)
            : UploadedFile::where('original_name', 'IRS_BMF_Combined.csv')
                ->orderByDesc('created_at')
                ->first();

        if (! $upload) {
            $this->error('No IRS BMF import found.');

            return self::FAILURE;
        }

        $progress = $upload->total_rows > 0
            ? round(($upload->processed_rows / $upload->total_rows) * 100, 1)
            : 0;

        $this->table(
            ['Field', 'Value'],
            [
                ['Upload ID', $upload->id],
                ['Batch ID', $upload->batch_id ?? '—'],
                ['Status', $upload->status],
                ['Processed rows', number_format($upload->processed_rows).' / '.number_format($upload->total_rows)],
                ['Processed chunks', number_format($upload->processed_chunks).' / '.number_format($upload->total_chunks)],
                ['Progress', "{$progress}%"],
                ['Started', $upload->created_at?->toDateTimeString() ?? '—'],
                ['Updated', $upload->updated_at?->toDateTimeString() ?? '—'],
            ]
        );

        if ($upload->batch_id) {
            $batch = Bus::findBatch($upload->batch_id);
            if ($batch) {
                $this->newLine();
                $this->info('Batch jobs: '.$batch->processedJobs().' / '.$batch->totalJobs.' processed');
                if ($batch->failedJobs > 0) {
                    $this->warn("Failed jobs: {$batch->failedJobs}");
                }
                if ($batch->finished()) {
                    $this->info('Batch finished at: '.$batch->finishedAt);
                }
            }
        }

        return self::SUCCESS;
    }
}
