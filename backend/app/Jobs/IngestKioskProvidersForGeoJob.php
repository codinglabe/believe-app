<?php

namespace App\Jobs;

use App\Services\KioskProviderAiIngestService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class IngestKioskProvidersForGeoJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 300;

    /**
     * @param  string  $stateAbbr  Two-letter state (e.g. CA)
     * @param  string  $rawCity  City as entered on profile (normalized inside ingest)
     * @param  bool  $force  Bypass geo cache TTL (profile updates use false; monthly refresh uses true).
     */
    public function __construct(
        public string $stateAbbr,
        public string $rawCity,
        public ?string $zip = null,
        public bool $force = false
    ) {}

    public function handle(KioskProviderAiIngestService $service): void
    {
        $service->ingest($this->stateAbbr, $this->rawCity, $this->zip, $this->force);
    }
}
