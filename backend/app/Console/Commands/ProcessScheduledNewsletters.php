<?php

namespace App\Console\Commands;

use App\Models\Newsletter;
use App\Models\NewsletterRecipient;
use App\Models\NewsletterEmail;
use App\Jobs\SendNewsletterJob;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class ProcessScheduledNewsletters extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'newsletter:process-scheduled';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Process scheduled newsletters that are ready to be sent';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Processing scheduled newsletters...');
        
        // Always use UTC for scheduler comparisons since database dates are stored in UTC
        $now = \Carbon\Carbon::now('UTC');
        $this->info("Current time (UTC): {$now->toDateTimeString()}");

        // Get all scheduled newsletters first for debugging
        $allScheduled = Newsletter::where('status', 'scheduled')->get();
        $this->info("Total scheduled newsletters: {$allScheduled->count()}");
        
        foreach ($allScheduled as $newsletter) {
            $this->info("Newsletter ID {$newsletter->id}: scheduled_at={$newsletter->scheduled_at}, send_date={$newsletter->send_date}, schedule_type={$newsletter->schedule_type}");
        }

        // Get newsletters that are scheduled and ready to be sent
        // This includes late newsletters (send_date <= now) - they will be sent immediately
        $scheduledNewsletters = Newsletter::where('status', 'scheduled')
            ->where(function($query) use ($now) {
                $query->where(function($q) use ($now) {
                    $q->whereNotNull('scheduled_at')
                      ->where('scheduled_at', '<=', $now);
                })->orWhere(function($q) use ($now) {
                    $q->whereNotNull('send_date')
                      ->where('send_date', '<=', $now);
                });
            })
            ->get();
        
        // Log late newsletters
        $lateNewsletters = $scheduledNewsletters->filter(function($newsletter) use ($now) {
            $sendDate = $newsletter->send_date ?? $newsletter->scheduled_at;
            return $sendDate && $sendDate->lt($now);
        });
        
        if ($lateNewsletters->isNotEmpty()) {
            $this->warn("Found {$lateNewsletters->count()} late newsletter(s) that will be sent now:");
            foreach ($lateNewsletters as $newsletter) {
                $sendDate = $newsletter->send_date ?? $newsletter->scheduled_at;
                $minutesLate = $now->diffInMinutes($sendDate);
                $this->warn("  - Newsletter ID {$newsletter->id} ({$newsletter->subject}): {$minutesLate} minutes late");
            }
        }

        if ($scheduledNewsletters->isEmpty()) {
            $this->info('No scheduled newsletters found that are ready to be sent.');
            return;
        }

        $this->info("Found {$scheduledNewsletters->count()} scheduled newsletters ready to process.");

        foreach ($scheduledNewsletters as $newsletter) {
            $this->processNewsletter($newsletter);
        }

        $this->info('Scheduled newsletters processing completed.');
    }

    /**
     * Process a single scheduled newsletter
     */
    protected function processNewsletter(Newsletter $newsletter): void
    {
        try {
            $this->info("Processing newsletter: {$newsletter->subject} (ID: {$newsletter->id})");

            // Update status to sending
            $newsletter->update(['status' => 'sending']);

            // Always let the job handle recipient creation - it's more flexible
            // The job will check if email records exist and create them if needed
            Log::info("Dispatching newsletter {$newsletter->id} to job queue", [
                'newsletter_id' => $newsletter->id,
                'target_type' => $newsletter->target_type,
                'target_users' => $newsletter->target_users,
                'target_organizations' => $newsletter->target_organizations,
            ]);

            // Dispatch job to send emails
            dispatch(new SendNewsletterJob($newsletter));
            
            $this->info("Newsletter {$newsletter->id} job dispatched to queue. Make sure 'php artisan queue:work' is running!");

        } catch (\Exception $e) {
            Log::error("Failed to process scheduled newsletter {$newsletter->id}: " . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            $newsletter->update(['status' => 'failed']);
            $this->error("Failed to process newsletter {$newsletter->id}: " . $e->getMessage());
        }
    }
}
