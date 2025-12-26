<?php

namespace App\Console\Commands;

use App\Models\BridgeIntegration;
use App\Models\BridgeKycKybSubmission;
use App\Models\AssociatedPerson;
use App\Models\ControlPerson;
use App\Models\BridgeWallet;
use App\Models\VerificationDocument;
use App\Models\LiquidationAddress;
use App\Models\CardWallet;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Log;

class DeleteBridgeData extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'bridge:delete-data 
                            {--user-id= : Delete data for a specific user ID}
                            {--organization-id= : Delete data for a specific organization ID}
                            {--integration-id= : Delete data for a specific bridge_integration_id}
                            {--all : Delete ALL Bridge data from all users and organizations}
                            {--force : Force deletion without confirmation}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Delete Bridge-related data from multiple tables (associated_persons, control_persons, bridge_integrations, bridge_kyc_kyb_submissions, bridge_wallets, verification_documents, liquidation_addresses)';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $userId = $this->option('user-id');
        $organizationId = $this->option('organization-id');
        $integrationId = $this->option('integration-id');
        $deleteAll = $this->option('all');
        $force = $this->option('force');

        // Validate that exactly one option is provided
        $providedOptions = array_filter([
            'user-id' => $userId,
            'organization-id' => $organizationId,
            'integration-id' => $integrationId,
            'all' => $deleteAll,
        ]);

        if (count($providedOptions) !== 1) {
            $this->error('Please provide exactly one of: --user-id, --organization-id, --integration-id, or --all');
            return 1;
        }

        // Find the bridge integration(s)
        $integrations = collect();

        if ($deleteAll) {
            // Get ALL bridge integrations
            $integrations = BridgeIntegration::all();
            
            if ($integrations->isEmpty()) {
                $this->warn("No Bridge integrations found in the database.");
                return 0;
            }
            
            $this->warn("⚠️  WARNING: This will delete ALL Bridge data from the database!");
            $this->info("Found {$integrations->count()} Bridge integration(s) to delete");
        } elseif ($userId) {
            $integrations = BridgeIntegration::where('integratable_type', \App\Models\User::class)
                ->where('integratable_id', $userId)
                ->get();
            
            if ($integrations->isEmpty()) {
                $this->warn("No Bridge integration found for user ID: {$userId}");
                return 0;
            }
            
            $this->info("Found {$integrations->count()} Bridge integration(s) for user ID: {$userId}");
        } elseif ($organizationId) {
            $integrations = BridgeIntegration::where('integratable_type', \App\Models\Organization::class)
                ->where('integratable_id', $organizationId)
                ->get();
            
            if ($integrations->isEmpty()) {
                $this->warn("No Bridge integration found for organization ID: {$organizationId}");
                return 0;
            }
            
            $this->info("Found {$integrations->count()} Bridge integration(s) for organization ID: {$organizationId}");
        } elseif ($integrationId) {
            $integration = BridgeIntegration::find($integrationId);
            
            if (!$integration) {
                $this->warn("No Bridge integration found with ID: {$integrationId}");
                return 0;
            }
            
            $integrations = collect([$integration]);
            $this->info("Found Bridge integration ID: {$integrationId}");
        }

        // Display what will be deleted
        $this->displayDeletionSummary($integrations);

        // Confirm deletion unless --force is used
        if (!$force) {
            $confirmMessage = $deleteAll 
                ? '⚠️  WARNING: You are about to delete ALL Bridge data from the database! This action cannot be undone! Are you absolutely sure?'
                : 'Are you sure you want to delete all this data? This action cannot be undone!';
            
            if (!$this->confirm($confirmMessage, false)) {
                $this->info('Deletion cancelled.');
                return 0;
            }
            
            // Double confirmation for --all
            if ($deleteAll) {
                if (!$this->confirm('This is your LAST chance to cancel. Type "yes" to proceed with deleting ALL Bridge data:', false)) {
                    $this->info('Deletion cancelled.');
                    return 0;
                }
            }
        }

        // Perform deletion
        try {
            $deletedCounts = [
                'integrations' => 0,
                'submissions' => 0,
                'associated_persons' => 0,
                'control_persons' => 0,
                'wallets' => 0,
                'card_wallets' => 0,
                'verification_documents' => 0,
                'liquidation_addresses' => 0,
            ];

            if ($deleteAll) {
                // For --all, truncate tables (empty them) in correct order
                // Note: TRUNCATE auto-commits in MySQL, so we don't use a transaction
                $this->info('Truncating all Bridge-related tables...');
                
                // Get counts before truncation
                $deletedCounts['associated_persons'] = DB::table('associated_persons')->count();
                $deletedCounts['control_persons'] = DB::table('control_persons')->count();
                $deletedCounts['verification_documents'] = DB::table('verification_documents')->count();
                $deletedCounts['submissions'] = DB::table('bridge_kyc_kyb_submissions')->count();
                $deletedCounts['liquidation_addresses'] = DB::table('liquidation_addresses')->count();
                $deletedCounts['card_wallets'] = DB::table('card_wallets')->count();
                $deletedCounts['wallets'] = DB::table('bridge_wallets')->count();
                $deletedCounts['integrations'] = DB::table('bridge_integrations')->count();
                
                // Disable foreign key checks temporarily for truncation (MySQL specific)
                $driver = DB::connection()->getDriverName();
                if ($driver === 'mysql') {
                    DB::statement('SET FOREIGN_KEY_CHECKS=0;');
                }
                
                try {
                    // Truncate in correct order (child tables first, then parent tables)
                    $this->info('  Truncating associated_persons...');
                    DB::table('associated_persons')->truncate();
                    
                    $this->info('  Truncating control_persons...');
                    DB::table('control_persons')->truncate();
                    
                    $this->info('  Truncating verification_documents...');
                    DB::table('verification_documents')->truncate();
                    
                    $this->info('  Truncating bridge_kyc_kyb_submissions...');
                    DB::table('bridge_kyc_kyb_submissions')->truncate();
                    
                    $this->info('  Truncating liquidation_addresses...');
                    DB::table('liquidation_addresses')->truncate();
                    
                    $this->info('  Truncating card_wallets...');
                    DB::table('card_wallets')->truncate();
                    
                    $this->info('  Truncating bridge_wallets...');
                    DB::table('bridge_wallets')->truncate();
                    
                    $this->info('  Truncating bridge_integrations...');
                    DB::table('bridge_integrations')->truncate();
                    
                    $this->info('✓ All tables truncated successfully!');
                } finally {
                    // Re-enable foreign key checks
                    if ($driver === 'mysql') {
                        DB::statement('SET FOREIGN_KEY_CHECKS=1;');
                    }
                }
            } else {
                // For specific IDs, delete row by row in a transaction
                DB::beginTransaction();
                
                try {
                    foreach ($integrations as $integration) {
                        $this->info("Processing Bridge Integration ID: {$integration->id}");

                        // Get all submissions for this integration
                        $submissions = BridgeKycKybSubmission::where('bridge_integration_id', $integration->id)->get();
                        $submissionIds = $submissions->pluck('id')->toArray();

                        // Delete in correct order to respect foreign key constraints

                        // 1. Delete associated_persons (references bridge_kyc_kyb_submissions)
                        if (!empty($submissionIds)) {
                            $deletedAssociated = AssociatedPerson::whereIn('bridge_kyc_kyb_submission_id', $submissionIds)->delete();
                            $deletedCounts['associated_persons'] += $deletedAssociated;
                            $this->info("  Deleted {$deletedAssociated} associated person(s)");
                        }

                        // 2. Delete control_persons (references bridge_kyc_kyb_submissions)
                        if (!empty($submissionIds)) {
                            $deletedControl = ControlPerson::whereIn('bridge_kyc_kyb_submission_id', $submissionIds)->delete();
                            $deletedCounts['control_persons'] += $deletedControl;
                            $this->info("  Deleted {$deletedControl} control person(s)");
                        }

                        // 3. Delete verification_documents (references bridge_kyc_kyb_submissions)
                        if (!empty($submissionIds)) {
                            $deletedDocs = VerificationDocument::whereIn('bridge_kyc_kyb_submission_id', $submissionIds)->delete();
                            $deletedCounts['verification_documents'] += $deletedDocs;
                            $this->info("  Deleted {$deletedDocs} verification document(s)");
                        }

                        // 4. Delete bridge_kyc_kyb_submissions (references bridge_integrations)
                        $deletedSubmissions = BridgeKycKybSubmission::where('bridge_integration_id', $integration->id)->delete();
                        $deletedCounts['submissions'] += $deletedSubmissions;
                        $this->info("  Deleted {$deletedSubmissions} KYC/KYB submission(s)");

                        // 5. Delete liquidation_addresses (references bridge_integrations)
                        $deletedLiquidation = LiquidationAddress::where('bridge_integration_id', $integration->id)->delete();
                        $deletedCounts['liquidation_addresses'] += $deletedLiquidation;
                        $this->info("  Deleted {$deletedLiquidation} liquidation address(es)");

                        // 6. Delete card_wallets (references bridge_integrations)
                        $deletedCardWallets = CardWallet::where('bridge_integration_id', $integration->id)->delete();
                        $deletedCounts['card_wallets'] += $deletedCardWallets;
                        $this->info("  Deleted {$deletedCardWallets} card wallet(s)");

                        // 7. Delete bridge_wallets (references bridge_integrations)
                        $deletedWallets = BridgeWallet::where('bridge_integration_id', $integration->id)->delete();
                        $deletedCounts['wallets'] += $deletedWallets;
                        $this->info("  Deleted {$deletedWallets} bridge wallet(s)");

                        // 8. Finally, delete bridge_integrations
                        $integration->delete();
                        $deletedCounts['integrations']++;
                        $this->info("  Deleted Bridge Integration ID: {$integration->id}");
                    }
                    
                    DB::commit();
                } catch (\Exception $e) {
                    DB::rollBack();
                    throw $e;
                }
            }

            // Display summary
            $this->newLine();
            $this->info('=== Deletion Summary ===');
            $this->info("Bridge Integrations: {$deletedCounts['integrations']}");
            $this->info("KYC/KYB Submissions: {$deletedCounts['submissions']}");
            $this->info("Associated Persons: {$deletedCounts['associated_persons']}");
            $this->info("Control Persons: {$deletedCounts['control_persons']}");
            $this->info("Bridge Wallets: {$deletedCounts['wallets']}");
            $this->info("Card Wallets: {$deletedCounts['card_wallets']}");
            $this->info("Verification Documents: {$deletedCounts['verification_documents']}");
            $this->info("Liquidation Addresses: {$deletedCounts['liquidation_addresses']}");

            $this->newLine();
            $this->info('✓ All data deleted successfully!');

            Log::info('Bridge data deleted via command', [
                'user_id' => $userId,
                'organization_id' => $organizationId,
                'integration_id' => $integrationId,
                'delete_all' => $deleteAll,
                'deleted_counts' => $deletedCounts,
            ]);

            return 0;

        } catch (\Exception $e) {
            // Only rollback if we're in a transaction (not for truncate operations)
            if (DB::transactionLevel() > 0) {
                DB::rollBack();
            }
            
            $this->error('Error during deletion: ' . $e->getMessage());
            $this->error('Stack trace: ' . $e->getTraceAsString());
            
            Log::error('Error deleting Bridge data via command', [
                'user_id' => $userId,
                'organization_id' => $organizationId,
                'integration_id' => $integrationId,
                'delete_all' => $deleteAll,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return 1;
        }
    }

    /**
     * Display a summary of what will be deleted
     */
    private function displayDeletionSummary($integrations)
    {
        $this->newLine();
        $this->info('=== Data to be Deleted ===');

        $totalSubmissions = 0;
        $totalAssociated = 0;
        $totalControl = 0;
        $totalWallets = 0;
        $totalCardWallets = 0;
        $totalDocs = 0;
        $totalLiquidation = 0;

        foreach ($integrations as $integration) {
            $submissions = BridgeKycKybSubmission::where('bridge_integration_id', $integration->id)->get();
            $submissionIds = $submissions->pluck('id')->toArray();
            $totalSubmissions += $submissions->count();

            if (!empty($submissionIds)) {
                $totalAssociated += AssociatedPerson::whereIn('bridge_kyc_kyb_submission_id', $submissionIds)->count();
                $totalControl += ControlPerson::whereIn('bridge_kyc_kyb_submission_id', $submissionIds)->count();
                $totalDocs += VerificationDocument::whereIn('bridge_kyc_kyb_submission_id', $submissionIds)->count();
            }

            $totalWallets += BridgeWallet::where('bridge_integration_id', $integration->id)->count();
            $totalCardWallets += CardWallet::where('bridge_integration_id', $integration->id)->count();
            $totalLiquidation += LiquidationAddress::where('bridge_integration_id', $integration->id)->count();
        }

        $this->table(
            ['Resource Type', 'Count'],
            [
                ['Bridge Integrations', $integrations->count()],
                ['KYC/KYB Submissions', $totalSubmissions],
                ['Associated Persons', $totalAssociated],
                ['Control Persons', $totalControl],
                ['Bridge Wallets', $totalWallets],
                ['Card Wallets', $totalCardWallets],
                ['Verification Documents', $totalDocs],
                ['Liquidation Addresses', $totalLiquidation],
            ]
        );
    }
}

