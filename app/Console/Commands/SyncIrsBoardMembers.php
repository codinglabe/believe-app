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
                            {--ein= : Process board members for a specific organization by EIN}
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
        // Default to current year (organizations file in December for current year)
        $taxYear = $this->option('year') ?? (string) now()->year;
        $ein = $this->option('ein');
        $updateExpired = $this->option('update-expired');

        // Update expired terms if requested
        if ($updateExpired) {
            $this->info('Checking for expired board member terms...');
            $expiredCount = $this->irsService->updateExpiredBoardMemberTerms();
            $this->info("Updated {$expiredCount} expired board member terms.");
        }

        // If EIN is provided, sync only for that organization
        if ($ein) {
            return $this->handleSingleEin($ein, $taxYear);
        }

        // Otherwise, process bulk sync
        return $this->handleBulkSync($taxYear);
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
        }

        // Sync board members for this EIN (even if organization doesn't exist in our DB)
        if ($organization) {
            $this->info("Syncing board members for organization: {$organization->name}...");
        } else {
            $this->info("Syncing IRS board members data for EIN: {$ein}...");
        }
        $this->newLine();

        $results = $this->irsService->syncBoardMembersForOrganization($ein, $taxYear);

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
