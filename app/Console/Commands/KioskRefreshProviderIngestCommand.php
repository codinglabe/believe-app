<?php

namespace App\Console\Commands;

use App\Jobs\IngestKioskProvidersForGeoJob;
use App\Models\KioskGeoIngestion;
use App\Models\User;
use App\Services\KioskProviderAiIngestService;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class KioskRefreshProviderIngestCommand extends Command
{
    protected $signature = 'kiosk:refresh-provider-ingest
                            {--sync : Run each ingest in this process (debug only; no queue)}
                            {--force : Run even when KIOSK_PROVIDER_MONTHLY_REFRESH_ENABLED is false}';

    protected $description = 'Force AI re-ingest of kiosk providers for every known geo (supporters + prior ingestions + existing provider rows). Use for monthly refresh of links and new providers.';

    public function handle(): int
    {
        if (! config('services.kiosk_provider_ingest.enabled', true)) {
            $this->error('Kiosk provider ingest is disabled (KIOSK_PROVIDER_INGEST_ENABLED).');

            return self::FAILURE;
        }

        if (! config('services.kiosk_provider_ingest.monthly_refresh_enabled', true) && ! $this->option('force')) {
            $this->warn('Monthly refresh is disabled. Set KIOSK_PROVIDER_MONTHLY_REFRESH_ENABLED=true or pass --force.');

            return self::FAILURE;
        }

        $geos = $this->collectGeos();

        if ($geos->isEmpty()) {
            $this->info('No geos to refresh (no supporter locations or ingest history yet).');

            return self::SUCCESS;
        }

        $this->info('Queueing '.$geos->count().' forced ingest job(s)…');

        $service = app(KioskProviderAiIngestService::class);
        $sync = $this->option('sync');

        foreach ($geos as $geo) {
            $job = new IngestKioskProvidersForGeoJob(
                $geo['state'],
                $geo['city'],
                $geo['zip'],
                true
            );

            if ($sync) {
                $job->handle($service);
                $this->line(' OK: '.$geo['state'].' / '.$geo['city']);
            } else {
                dispatch($job);
            }
        }

        Log::info('Kiosk provider monthly refresh: jobs dispatched', [
            'count' => $geos->count(),
            'sync' => $sync,
        ]);

        if (! $sync) {
            $this->comment('Ensure a queue worker is running: php artisan queue:work');
        }

        return self::SUCCESS;
    }

    /**
     * Unique geos: supporters, historical ingestions, and any row already in kiosk_providers.
     *
     * @return Collection<int, array{state: string, city: string, zip: ?string}>
     */
    protected function collectGeos(): Collection
    {
        $seen = [];

        $add = function (string $stateRaw, string $cityRaw, mixed $zipRaw) use (&$seen): void {
            $state = KioskProviderAiIngestService::normalizeStateAbbr($stateRaw);
            $city = KioskProviderAiIngestService::normalizeCity($cityRaw);
            $zip = KioskProviderAiIngestService::normalizeZip($zipRaw);
            if (strlen($state) !== 2 || $city === '') {
                return;
            }
            $key = $state.'|'.$city.'|'.$zip;
            if (isset($seen[$key])) {
                return;
            }
            $seen[$key] = [
                'state' => $stateRaw,
                'city' => $cityRaw,
                'zip' => $zipRaw !== null && trim((string) $zipRaw) !== '' ? (string) $zipRaw : null,
            ];
        };

        User::query()
            ->where('role', 'user')
            ->whereNotNull('city')
            ->whereNotNull('state')
            ->where('city', '!=', '')
            ->where('state', '!=', '')
            ->orderBy('id')
            ->chunkById(500, function ($users) use ($add): void {
                foreach ($users as $u) {
                    $add((string) $u->state, (string) $u->city, $u->zipcode);
                }
            });

        KioskGeoIngestion::query()
            ->orderBy('id')
            ->chunkById(500, function ($rows) use ($add): void {
                foreach ($rows as $r) {
                    $zip = $r->zip_normalized !== '' && $r->zip_normalized !== null
                        ? $r->zip_normalized
                        : null;
                    $add($r->state_abbr, $r->normalized_city, $zip);
                }
            });

        if (DB::getSchemaBuilder()->hasTable('kiosk_providers')) {
            DB::table('kiosk_providers')
                ->select('state_abbr', 'normalized_city', 'zip_normalized')
                ->distinct()
                ->orderBy('state_abbr')
                ->orderBy('normalized_city')
                ->orderBy('zip_normalized')
                ->chunk(500, function ($rows) use ($add): void {
                    foreach ($rows as $r) {
                        $zip = $r->zip_normalized !== '' && $r->zip_normalized !== null
                            ? $r->zip_normalized
                            : null;
                        $add($r->state_abbr, $r->normalized_city, $zip);
                    }
                });
        }

        return collect(array_values($seen));
    }
}
