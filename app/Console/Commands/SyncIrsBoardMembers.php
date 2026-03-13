<?php

namespace App\Console\Commands;

use App\Jobs\ProcessIrsZipJob;
use App\Models\Organization;
use App\Services\IRSForm990Service;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SyncIrsBoardMembers extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'irs:sync-board-members 
                            {--year= : Tax year to sync (default: previous year — IRS bulk data is usually complete)}
                            {--download : Download IRS data before syncing}
                            {--bulk : Process entire IRS XML file for all organizations (default)}
                            {--ein= : Process board members for a specific organization by EIN}
                            {--update-expired : Update expired board member terms}
                            {--queue : Dispatch one job per ZIP to irs-import queue (run queue:work to process)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync board members from IRS Form 990 XML files';

    protected IRSForm990Service $irsService;

    public function __construct(IRSForm990Service $irsService)
    {
        parent::__construct();
        $this->irsService = $irsService;
    }

    /**
     * Execute the console command.
     */
    public function handle()
    {
        // Allow long run and enough memory (many hosts restrict CLI; log so we can debug live server)
        $memoryLimit = env('IRS_SYNC_MEMORY_LIMIT', '1024M');
        $before = ini_get('memory_limit');
        if ($memoryLimit && $memoryLimit !== '-1') {
            @ini_set('memory_limit', $memoryLimit);
        }
        $after = ini_get('memory_limit');
        Log::info("IRS sync: memory_limit before={$before} after={$after} (set " . ($memoryLimit ?: 'none') . ")");
        set_time_limit(0);

        // Previous two years: e.g. in 2026 we sync 2025 and 2024. No substitution — we never store wrong-year data.
        $previousYear = now()->year - 1;
        $taxYear = $this->option('year') ?? (string) $previousYear;
        $ein = $this->option('ein');
        if (!$this->option('year')) {
            $this->info('Syncing previous two years: ' . $previousYear . ' and ' . (now()->year - 2) . ' (current year ' . now()->year . ').');
        }
        $updateExpired = $this->option('update-expired');

        // Update expired terms if requested
        if ($updateExpired) {
            $this->info('Checking for expired board member terms...');
            $expiredCount = $this->irsService->updateExpiredBoardMemberTerms();
            $this->info("Updated {$expiredCount} expired board member terms.");
            // If only --update-expired was passed (no EIN, no queue), exit after updating expired terms
            if (!$ein && !$this->option('queue')) {
                $this->info('Done (update-expired only).');
                return Command::SUCCESS;
            }
        }

        // If EIN is provided, sync only for that organization
        if ($ein) {
            return $this->handleSingleEin($ein, $taxYear);
        }

        // Dispatch to queue (one job per ZIP) — best for live servers with memory limits
        if ($this->option('queue')) {
            return $this->dispatchBulkSyncJobs($taxYear);
        }

        // Otherwise, process bulk sync inline
        return $this->handleBulkSync($taxYear);
    }

    /**
     * Dispatch one ProcessIrsZipJob per ZIP file for the previous two years (same as bulk sync).
     */
    private function dispatchBulkSyncJobs(string $taxYear): int
    {
        $yearInt = (int) $taxYear;
        $yearsToSync = [$yearInt, $yearInt - 1];
        $yearsToSync = array_filter($yearsToSync, fn ($y) => $y >= 2019);
        $yearsToSync = array_values($yearsToSync);

        $totalDispatched = 0;
        foreach ($yearsToSync as $yearToSync) {
            $yearStr = (string) $yearToSync;
            $zipFileNames = $this->irsService->getXmlZipFileNamesForYearPublic($yearStr);
            if (empty($zipFileNames)) {
                $this->warn('No ZIP filenames for year ' . $yearStr);
                continue;
            }
            foreach ($zipFileNames as $zipFileName) {
                ProcessIrsZipJob::dispatch($yearStr, $zipFileName);
                $totalDispatched++;
            }
            $this->info('Dispatched ' . count($zipFileNames) . ' jobs for year ' . $yearStr . '.');
        }

        if ($totalDispatched === 0) {
            $this->warn('No jobs dispatched (no ZIP filenames for ' . implode(', ', $yearsToSync) . ').');
            return Command::FAILURE;
        }

        $this->info('Dispatched ' . $totalDispatched . ' jobs total (previous two years) to queue irs-import.');
        $this->line('');
        $this->line('Run a worker to process them (e.g. in a separate terminal or screen):');
        $this->line('  php artisan queue:work --queue=irs-import --memory=1024 --tries=2');
        $this->line('');
        $this->line('For very large ZIPs (job not completing / timeout): set in .env and restart worker:');
        $this->line('  IRS_JOB_TIMEOUT=14400   (e.g. 4 hours)');
        $this->line('  IRS_SYNC_MEMORY_LIMIT=2048M');
        $this->line('');
        $this->line('Each job also updates expired terms (status, removed_date); no separate command needed.');
        return Command::SUCCESS;
    }

    /**
     * Handle syncing for a single organization by EIN
     */
    private function handleSingleEin(string $ein, string $taxYear): int
    {
        $this->info("Starting IRS Board Members sync for EIN: {$ein}");

        // Clean EIN (remove dashes and spaces)
        $cleanEIN = preg_replace('/[^0-9]/', '', $ein);
        
        // Check if organization exists in our database
        $organization = Organization::whereRaw("REPLACE(REPLACE(ein, '-', ''), ' ', '') = ?", [$cleanEIN])
            ->first();

        if ($organization) {
            $this->info("Found organization in database: {$organization->name} (EIN: {$ein})");
        } else {
            $this->warn("Organization not found in database with EIN: {$ein} (clean: {$cleanEIN})");
            $this->info("Will still sync IRS board members data, but verification will be skipped.");
        }
        $this->newLine();

        // Previous two years to fetch, one by one: e.g. 2024 and 2023
        $yearInt = (int) $taxYear;
        $yearsToSync = [$yearInt, $yearInt - 1];
        $yearsToSync = array_filter($yearsToSync, fn ($y) => $y >= 2019);
        $yearsToSync = array_values($yearsToSync);

        $results = [
            'processed' => 0,
            'created' => 0,
            'updated' => 0,
            'inactivated' => 0,
            'errors' => 0,
        ];

        foreach ($yearsToSync as $index => $yearToSync) {
            $yearStr = (string) $yearToSync;
            $this->newLine();
            $this->info('--- Year ' . $yearStr . ' (' . ($index + 1) . '/' . count($yearsToSync) . ') ---');

            $dataDir = storage_path("app/irs-data/{$yearStr}");
            $xmlFiles = [];
            if (is_dir($dataDir)) {
                $xmlFiles = array_filter(glob("{$dataDir}/*.xml"), function ($file) {
                    return strpos($file, 'zips') === false;
                });
            }

            if ($this->option('download') || empty($xmlFiles)) {
                if (empty($xmlFiles)) {
                    $this->info("No XML files for {$yearStr}. Downloading IRS data (this year only)...");
                }
                $progress = fn (string $msg) => $this->line($msg);
                $downloaded = $this->irsService->downloadIRSData($yearStr, $progress);
                if (!$downloaded && empty($xmlFiles)) {
                    $this->warn("No data for year {$yearStr}; skipping.");
                    continue;
                }
                if ($downloaded) {
                    $this->info("IRS data ready for year {$yearStr}.");
                } elseif (!empty($xmlFiles)) {
                    $this->info("Using existing XML files for year {$yearStr}.");
                }
            }

            if ($organization) {
                $this->info("Syncing board members for {$organization->name} (year {$yearStr})...");
            } else {
                $this->info("Syncing IRS board members for EIN {$ein} (year {$yearStr})...");
            }

            $yearResults = $this->irsService->syncBoardMembersForOrganization($ein, $yearStr);
            $results['processed'] += $yearResults['processed'];
            $results['created'] += $yearResults['created'];
            $results['updated'] += $yearResults['updated'];
            $results['inactivated'] += $yearResults['inactivated'];
            $results['errors'] += $yearResults['errors'];
        }

        $this->newLine();
        if ($organization) {
            $this->info("Sync Summary for {$organization->name}:");
        } else {
            $this->info("Sync Summary for EIN {$ein}:");
        }
        $this->info("  - Processed: {$results['processed']}");
        $this->info("  - Created: {$results['created']}");
        $this->info("  - Updated: {$results['updated']}");
        $this->info("  - Inactivated: {$results['inactivated']}");
        if ($results['errors'] > 0) {
            $this->warn("  - Errors: {$results['errors']}");
        }

        // Only verify if organization exists in our database (use first synced year)
        if ($organization && !empty($yearsToSync)) {
            $this->newLine();
            $this->info("Verifying board members against IRS data...");
            $verificationResults = $this->irsService->verifyBoardMembersAgainstIRS($ein, (string) $yearsToSync[0]);
            $this->info("Verification Summary:");
            $this->info("  - Verified: {$verificationResults['verified']}");
            $this->info("  - Not found in IRS data: {$verificationResults['not_found']}");
            $this->info("  - Deactivated due to not found: {$verificationResults['deactivated']}");
        } else {
            if (!$organization) {
                $this->newLine();
                $this->warn("Skipping verification - organization not found in database.");
            }
            $this->info("IRS board members data has been synced and stored.");
        }

        $this->newLine();
        $this->info("Updating expired board member terms (status, term_end_date, removed_date)...");
        $expiredCount = $this->irsService->updateExpiredBoardMemberTerms();
        $this->info("  - Marked as expired: {$expiredCount}");

        $this->newLine();
        $this->info('Done!');
        return Command::SUCCESS;
    }

    /**
     * Handle bulk sync for all organizations (previous two years, one by one).
     */
    private function handleBulkSync(string $taxYear): int
    {
        $this->info('Starting IRS Board Members bulk sync (previous two years)...');

        $yearInt = (int) $taxYear;
        $yearsToSync = [$yearInt, $yearInt - 1];
        $yearsToSync = array_filter($yearsToSync, fn ($y) => $y >= 2019);
        $yearsToSync = array_values($yearsToSync);

        $results = [
            'organizations_processed' => 0,
            'board_members_found' => 0,
            'board_members_created' => 0,
            'board_members_updated' => 0,
            'board_members_inactivated' => 0,
            'errors' => 0,
        ];

        foreach ($yearsToSync as $index => $yearToSync) {
            $yearStr = (string) $yearToSync;
            $this->newLine();
            $this->info('--- Year ' . $yearStr . ' (' . ($index + 1) . '/' . count($yearsToSync) . ') ---');

            $dataDir = storage_path("app/irs-data/{$yearStr}");
            $xmlFiles = [];
            if (is_dir($dataDir)) {
                $xmlFiles = array_filter(glob("{$dataDir}/*.xml"), function ($file) {
                    return strpos($file, 'zips') === false;
                });
            }

            if ($this->option('download') || empty($xmlFiles)) {
                if (empty($xmlFiles)) {
                    $this->info("No XML files found. Downloading IRS data for year {$yearStr}...");
                    $this->warn("This can take 30–90 minutes (each ZIP is 50–500+ MB). Do not interrupt.");
                } else {
                    $this->info("Downloading IRS data for year {$yearStr}...");
                }
                $progress = fn (string $msg) => $this->line($msg);
                $downloaded = $this->irsService->downloadIRSData($yearStr, $progress);
                if (!$downloaded && empty($xmlFiles)) {
                    $this->warn("No data for year {$yearStr}; skipping. Run with --download again or check IRS availability.");
                    continue;
                }
                if ($downloaded) {
                    $this->info("IRS data downloaded and extracted successfully for year {$yearStr}.");
                } elseif (!empty($xmlFiles)) {
                    $this->info("Download failed, but found existing XML files. Continuing...");
                }
            } else {
                $this->info("Found " . count($xmlFiles) . " existing XML file(s) for year {$yearStr}.");
            }

            $this->info("Processing bulk IRS XML for year {$yearStr} (all organizations)...");
            $this->newLine();

            $yearResults = $this->irsService->processBulkIRSBoardMembers($yearStr);
            $results['organizations_processed'] += $yearResults['organizations_processed'];
            $results['board_members_found'] += $yearResults['board_members_found'];
            $results['board_members_created'] += $yearResults['board_members_created'];
            $results['board_members_updated'] += $yearResults['board_members_updated'];
            $results['board_members_inactivated'] += $yearResults['board_members_inactivated'];
            $results['errors'] += $yearResults['errors'];
        }

        $this->newLine();
        $this->info("Bulk Processing Summary (all years):");
        $this->info("  - Organizations processed: {$results['organizations_processed']}");
        $this->info("  - Board members found: {$results['board_members_found']}");
        $this->info("  - Board members created: {$results['board_members_created']}");
        $this->info("  - Board members updated: {$results['board_members_updated']}");
        $this->info("  - Board members inactivated: {$results['board_members_inactivated']}");
        if ($results['errors'] > 0) {
            $this->warn("  - Errors: {$results['errors']}");
        }

        if (!empty($yearsToSync)) {
            $this->newLine();
            $this->info("Verifying board members against IRS data...");
            $verificationResults = $this->irsService->verifyBoardMembersAgainstIRS(null, (string) $yearsToSync[0]);
            $this->info("Verification Summary:");
            $this->info("  - Verified: {$verificationResults['verified']}");
            $this->info("  - Not found in IRS data: {$verificationResults['not_found']}");
            $this->info("  - Deactivated due to not found: {$verificationResults['deactivated']}");
        }

        $this->newLine();
        $this->info("Updating expired board member terms (status, term_end_date, removed_date)...");
        $expiredCount = $this->irsService->updateExpiredBoardMemberTerms();
        $this->info("  - Marked as expired: {$expiredCount}");

        $this->newLine();
        $this->info('Done!');
        return Command::SUCCESS;
    }

}
