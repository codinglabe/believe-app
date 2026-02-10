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

        // Default to previous year: IRS bulk XML for current year is often incomplete; prior year is usually fully available.
        $taxYear = $this->option('year') ?? (string) (now()->year - 1);
        $ein = $this->option('ein');
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
     * Dispatch one ProcessIrsZipJob per ZIP file to the irs-import queue.
     */
    private function dispatchBulkSyncJobs(string $taxYear): int
    {
        $zipFileNames = $this->irsService->getXmlZipFileNamesForYearPublic($taxYear);
        if (empty($zipFileNames)) {
            $this->warn('No ZIP filenames for year ' . $taxYear);
            return Command::FAILURE;
        }
        foreach ($zipFileNames as $zipFileName) {
            ProcessIrsZipJob::dispatch($taxYear, $zipFileName);
        }
        $this->info('Dispatched ' . count($zipFileNames) . ' jobs to queue irs-import for year ' . $taxYear . '.');
        $this->line('');
        $this->line('Run a worker to process them (e.g. in a separate terminal or screen):');
        $this->line('  php artisan queue:work --queue=irs-import --memory=1024 --tries=2');
        $this->line('');
        $this->line('For very large ZIPs (job not completing / timeout): set in .env and restart worker:');
        $this->line('  IRS_JOB_TIMEOUT=14400   (e.g. 4 hours)');
        $this->line('  IRS_SYNC_MEMORY_LIMIT=2048M');
        $this->line('');
        $this->line('After jobs finish, optionally run verification:');
        $this->line('  php artisan irs:sync-board-members --update-expired');
        return Command::SUCCESS;
    }

    /**
     * Get years to try for download (requested first, then fallbacks).
     */
    private function getYearsToTry(int $year): array
    {
        $years = [$year];
        if ($year - 1 >= 2019) {
            $years[] = $year - 1;
        }
        if ($year - 2 >= 2019) {
            $years[] = $year - 2;
        }
        return $years;
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

        // Check if IRS data exists
        $dataDir = storage_path("app/irs-data/{$taxYear}");
        $xmlFiles = [];
        if (is_dir($dataDir)) {
            $xmlFiles = array_filter(glob("{$dataDir}/*.xml"), function($file) {
                return strpos($file, 'zips') === false;
            });
        }

        // Download IRS data if requested or if no files exist (auto-try fallback years)
        if ($this->option('download') || empty($xmlFiles)) {
            $yearsToTry = $this->getYearsToTry((int) $taxYear);
            $downloaded = false;
            foreach ($yearsToTry as $tryYear) {
                $tryYearStr = (string) $tryYear;
                if ($tryYearStr !== $taxYear) {
                    $this->info("Trying fallback year {$tryYearStr}...");
                } elseif (empty($xmlFiles)) {
                    $this->info("No XML files found. Downloading IRS data for year {$taxYear}...");
                    $this->warn("This can take 30–90 minutes (each ZIP is 50–500+ MB). Do not interrupt.");
                } else {
                    $this->info("Downloading IRS data for year {$taxYear}...");
                }
                $progress = fn (string $msg) => $this->line($msg);
                if ($this->irsService->downloadIRSData($tryYearStr, $progress)) {
                    $this->info("IRS data downloaded and extracted successfully for year {$tryYearStr}.");
                    if ($tryYearStr !== $taxYear) {
                        $taxYear = $tryYearStr;
                        $this->info("Using year {$taxYear} for sync.");
                    }
                    $downloaded = true;
                    break;
                }
            }
            if (!$downloaded && empty($xmlFiles)) {
                $this->warn("Automatic download failed for all tried years (" . implode(', ', $yearsToTry) . ").");
                $this->info("You can download manually from: https://www.irs.gov/charities-non-profits/form-990-series-downloads");
                $this->info("Extract ZIP files to: storage/app/irs-data/<year>/");
                return Command::FAILURE;
            }
            if (!$downloaded && !empty($xmlFiles)) {
                $this->info("Download failed, but found existing XML files. Continuing with existing files...");
            }
        }

        // Sync board members for this EIN (even if organization doesn't exist in our DB)
        if ($organization) {
            $this->info("Syncing board members for organization: {$organization->name}...");
        } else {
            $this->info("Syncing IRS board members data for EIN: {$ein}...");
        }
        $this->newLine();

        $results = $this->irsService->syncBoardMembersForOrganization($ein, (string) $taxYear);

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

        // Only verify if organization exists in our database
        if ($organization) {
            $this->newLine();
            $this->info("Verifying board members against IRS data...");
            
            // Verify board members for this organization
            $verificationResults = $this->irsService->verifyBoardMembersAgainstIRS($ein, $taxYear);
            
            $this->info("Verification Summary:");
            $this->info("  - Verified: {$verificationResults['verified']}");
            $this->info("  - Not found in IRS data: {$verificationResults['not_found']}");
            $this->info("  - Deactivated due to not found: {$verificationResults['deactivated']}");
        } else {
            $this->newLine();
            $this->warn("Skipping verification - organization not found in database.");
            $this->info("IRS board members data has been synced and stored.");
        }

        $this->newLine();
        $this->info('Done!');
        return Command::SUCCESS;
    }

    /**
     * Handle bulk sync for all organizations
     */
    private function handleBulkSync(string $taxYear): int
    {
        $this->info('Starting IRS Board Members bulk sync...');

        // Check if XML files already exist
        $dataDir = storage_path("app/irs-data/{$taxYear}");
        $xmlFiles = [];
        if (is_dir($dataDir)) {
            $xmlFiles = array_filter(glob("{$dataDir}/*.xml"), function($file) {
                return strpos($file, 'zips') === false;
            });
        }

        // Download IRS data if requested or if no files exist (auto-try fallback years)
        if ($this->option('download') || empty($xmlFiles)) {
            $yearsToTry = $this->getYearsToTry((int) $taxYear);
            $downloaded = false;
            foreach ($yearsToTry as $tryYear) {
                $tryYearStr = (string) $tryYear;
                if ($tryYearStr !== $taxYear) {
                    $this->info("Trying fallback year {$tryYearStr}...");
                } elseif (empty($xmlFiles)) {
                    $this->info("No XML files found. Downloading IRS data for year {$taxYear}...");
                    $this->warn("This can take 30–90 minutes (each ZIP is 50–500+ MB). Do not interrupt.");
                } else {
                    $this->info("Downloading IRS data for year {$taxYear}...");
                }
                $progress = fn (string $msg) => $this->line($msg);
                if ($this->irsService->downloadIRSData($tryYearStr, $progress)) {
                    $this->info("IRS data downloaded and extracted successfully for year {$tryYearStr}.");
                    if ($tryYearStr !== $taxYear) {
                        $taxYear = $tryYearStr;
                        $this->info("Using year {$taxYear} for bulk sync.");
                    }
                    $downloaded = true;
                    break;
                }
            }
            if (!$downloaded && empty($xmlFiles)) {
                $this->warn("Automatic download failed for all tried years (" . implode(', ', $yearsToTry) . ").");
                $this->info("You can download manually from: https://www.irs.gov/charities-non-profits/form-990-series-downloads");
                $this->info("Extract ZIP files to: storage/app/irs-data/<year>/");
                return Command::FAILURE;
            }
            if (!$downloaded && !empty($xmlFiles)) {
                $this->info("Download failed, but found existing XML files. Continuing with existing files...");
            }
        } else {
            $this->info("Found " . count($xmlFiles) . " existing XML file(s). Processing without download...");
        }

        // Process bulk IRS XML file (all organizations)
        $this->info("Processing bulk IRS XML file for year {$taxYear}...");
        $this->info("This will extract board members for ALL organizations in the IRS file.");
        $this->newLine();

        $results = $this->irsService->processBulkIRSBoardMembers($taxYear);

        $this->newLine();
        $this->info("Bulk Processing Summary:");
        $this->info("  - Organizations processed: {$results['organizations_processed']}");
        $this->info("  - Board members found: {$results['board_members_found']}");
        $this->info("  - Board members created: {$results['board_members_created']}");
        $this->info("  - Board members updated: {$results['board_members_updated']}");
        $this->info("  - Board members inactivated: {$results['board_members_inactivated']}");
        
        if ($results['errors'] > 0) {
            $this->warn("  - Errors: {$results['errors']}");
        }

        $this->newLine();
        $this->info("Verifying board members against IRS data...");
        $verificationResults = $this->irsService->verifyBoardMembersAgainstIRS(null, $taxYear);
        
        $this->info("Verification Summary:");
        $this->info("  - Verified: {$verificationResults['verified']}");
        $this->info("  - Not found in IRS data: {$verificationResults['not_found']}");
        $this->info("  - Deactivated due to not found: {$verificationResults['deactivated']}");

        $this->newLine();
        $this->info('Done!');
        return Command::SUCCESS;
    }

}
