<?php

namespace App\Console\Commands;

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
                            {--year= : Tax year to sync (default: current year)}
                            {--download : Download IRS data before syncing}
                            {--bulk : Process entire IRS XML file for all organizations (default)}
                            {--update-expired : Update expired board member terms}';

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
        $this->info('Starting IRS Board Members bulk sync...');

        // Default to current year (organizations file in December for current year)
        $taxYear = $this->option('year') ?? (string) now()->year;
        $updateExpired = $this->option('update-expired');

        // Update expired terms if requested
        if ($updateExpired) {
            $this->info('Checking for expired board member terms...');
            $expiredCount = $this->irsService->updateExpiredBoardMemberTerms();
            $this->info("Updated {$expiredCount} expired board member terms.");
        }

        // Check if XML files already exist
        $dataDir = storage_path("app/irs-data/{$taxYear}");
        $xmlFiles = [];
        if (is_dir($dataDir)) {
            $xmlFiles = array_filter(glob("{$dataDir}/*.xml"), function($file) {
                return strpos($file, 'zips') === false;
            });
        }

        // Download IRS data if requested or if no files exist
        if ($this->option('download') || empty($xmlFiles)) {
            if (empty($xmlFiles)) {
                $this->info("No XML files found. Downloading IRS data for year {$taxYear}...");
            } else {
                $this->info("Downloading IRS data for year {$taxYear}...");
            }
            
            if ($this->irsService->downloadIRSData($taxYear)) {
                $this->info("IRS data downloaded and extracted successfully.");
            } else {
                if (empty($xmlFiles)) {
                    $this->warn("Failed to download IRS data automatically.");
                    $this->info("Please download manually from: https://www.irs.gov/charities-non-profits/form-990-series-downloads");
                    $this->info("Extract ZIP files to: storage/app/irs-data/{$taxYear}/");
                    return Command::FAILURE;
                } else {
                    $this->info("Download failed, but found existing XML files. Continuing with existing files...");
                }
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
        $this->info('Done!');
        return Command::SUCCESS;
    }

}
