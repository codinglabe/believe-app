<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\IRSForm990Service;
use App\Models\Organization;
use App\Models\Form990Filing;
use App\Mail\Form990FilingReminder;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class CheckIRSForm990Filings extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'irs:check-form990-filings 
                            {--year= : Specific tax year to check (default: current year)}
                            {--download : Download IRS data before checking}
                            {--notify : Send email notifications for missing filings}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check IRS Form 990 filing status for all active organizations';

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
        $this->info('Starting IRS Form 990 filing check...');

        // Default to previous year: IRS bulk data for current year is not available yet
        $taxYear = $this->option('year') ?? \App\Services\IRSForm990Service::defaultTaxYearForIrsData();

        // Download IRS data if requested
        if ($this->option('download')) {
            $this->info("Downloading IRS data for year {$taxYear}...");
            if ($this->irsService->downloadIRSData($taxYear)) {
                $this->info("IRS data downloaded successfully.");
            } else {
                $this->warn("Failed to download IRS data. Continuing with cached data...");
            }
        }

        // Check all organizations
        $this->info("Checking Form 990 filings for tax year {$taxYear}...");
        $results = $this->irsService->checkAllOrganizations($taxYear);

        if ($results['checked'] === 0 && $results['errors'] === 0) {
            $this->warn("No organizations were checked. This might indicate:");
            $this->warn("  - The organizations table does not exist in the database");
            $this->warn("  - There are no active organizations with EIN numbers");
            $this->warn("  - Check your database configuration and run migrations if needed");
        }

        $this->info("Check completed:");
        $this->info("  - Organizations checked: {$results['checked']}");
        $this->info("  - Filings found: {$results['found']}");
        $this->info("  - Filings missing: {$results['missing']}");
        $this->info("  - Errors: {$results['errors']}");

        // Send notifications if requested
        if ($this->option('notify')) {
            $this->info("Sending email notifications for missing filings...");
            $this->sendNotifications($taxYear);
        }

        $this->info('Done!');
        
        return Command::SUCCESS;
    }

    /**
     * Send email notifications for organizations with missing filings
     */
    private function sendNotifications(string $taxYear): void
    {
        $overdueFilings = Form990Filing::where('tax_year', $taxYear)
            ->where('is_filed', false)
            ->where(function ($query) {
                $query->where('due_date', '<', now())
                    ->orWhere('extended_due_date', '<', now());
            })
            ->with('organization.user')
            ->get();

        $sent = 0;
        $failed = 0;

        foreach ($overdueFilings as $filing) {
            $organization = $filing->organization;
            $user = $organization->user;

            if (!$user || !$user->email) {
                $failed++;
                continue;
            }

            try {
                Mail::to($user->email)->send(new Form990FilingReminder($organization, $filing));
                $sent++;
                
                // Update meta to track notification
                $meta = $filing->meta ?? [];
                $meta['last_notification_sent'] = now()->toIso8601String();
                $filing->meta = $meta;
                $filing->save();
                
            } catch (\Exception $e) {
                Log::error("Failed to send Form 990 reminder to {$user->email}: " . $e->getMessage());
                $failed++;
            }
        }

        $this->info("  - Notifications sent: {$sent}");
        if ($failed > 0) {
            $this->warn("  - Notifications failed: {$failed}");
        }
    }
}
