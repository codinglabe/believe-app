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

        $this->recoverStuckSendingNewsletters();

        $this->info('Scheduled newsletters processing completed.');
    }

    /**
     * Re-queue or finalize newsletters left in "sending" when the queue job never ran or did not close out.
     */
    protected function recoverStuckSendingNewsletters(): void
    {
        $cutoff = \Carbon\Carbon::now('UTC')->subMinutes(5);

        $stuck = Newsletter::query()
            ->where('status', 'sending')
            ->where('updated_at', '<=', $cutoff)
            ->get();

        if ($stuck->isEmpty()) {
            return;
        }

        $this->warn("Checking {$stuck->count()} stuck sending newsletter(s)...");

        foreach ($stuck as $newsletter) {
            $emailCount = NewsletterEmail::where('newsletter_id', $newsletter->id)->count();
            $pendingCount = NewsletterEmail::where('newsletter_id', $newsletter->id)
                ->where('status', 'pending')
                ->count();

            if ($emailCount > 0 && $pendingCount === 0) {
                $processedCount = NewsletterEmail::where('newsletter_id', $newsletter->id)
                    ->whereIn('status', ['sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed'])
                    ->count();

                if ($processedCount >= $emailCount) {
                    $newsletter->update([
                        'status' => 'sent',
                        'sent_at' => \Carbon\Carbon::now('UTC'),
                    ]);
                    $this->warn("Newsletter {$newsletter->id} marked sent (recipients already processed).");

                    continue;
                }
            }

            Log::warning('Re-dispatching stuck newsletter send', [
                'newsletter_id' => $newsletter->id,
                'email_count' => $emailCount,
                'pending_count' => $pendingCount,
            ]);

            dispatch(new SendNewsletterJob($newsletter));
            $this->warn("Newsletter {$newsletter->id} re-queued.");
        }
    }

    /**
     * Process a single scheduled newsletter
     */
    protected function processNewsletter(Newsletter $newsletter): void
    {
        try {
            $this->info("Processing newsletter: {$newsletter->subject} (ID: {$newsletter->id})");

            $newsletter->loadMissing('organization');
            $meta = $newsletter->metadata ?? [];
            $meta = is_array($meta) ? $meta : [];
            $ownerId = $newsletter->organization?->user_id;
            if ($ownerId) {
                $meta['billing_user_id'] = (int) $ownerId;
            }

            // Update status to sending (charge org owner's wallet for cron sends)
            $newsletter->update([
                'status' => 'sending',
                'metadata' => $meta,
            ]);

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
