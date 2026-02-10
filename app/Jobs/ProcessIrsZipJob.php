<?php

namespace App\Jobs;

use App\Services\IRSForm990Service;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessIrsZipJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 2;
    public $backoff = 60;

    public function __construct(
        private string $taxYear,
        private string $zipFileName
    ) {
        $this->onQueue('irs-import');
        $this->timeout = (int) config('services.irs.job_timeout', 7200);
    }

    public function handle(IRSForm990Service $irsService): void
    {
        $memoryLimit = env('IRS_SYNC_MEMORY_LIMIT', '1024M');
        if ($memoryLimit && $memoryLimit !== '-1') {
            @ini_set('memory_limit', $memoryLimit);
        }

        Log::info("ProcessIrsZipJob started: {$this->zipFileName} (year {$this->taxYear})");
        $result = $irsService->processSingleZipByFilename($this->taxYear, $this->zipFileName);
        Log::info("ProcessIrsZipJob finished: " . $result['message']);
    }
}
