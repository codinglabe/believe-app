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

        // Get newsletters that are scheduled and ready to be sent
        $scheduledNewsletters = Newsletter::where('status', 'scheduled')
            ->where(function($query) {
                $query->where('scheduled_at', '<=', now())
                      ->orWhere('send_date', '<=', now());
            })
            ->get();

        if ($scheduledNewsletters->isEmpty()) {
            $this->info('No scheduled newsletters found.');
            return;
        }

        $this->info("Found {$scheduledNewsletters->count()} scheduled newsletters to process.");

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

            // For new targeting system, let the job handle recipient creation
            // For backward compatibility, check if it's using old system
            if ($newsletter->target_type === 'all' && empty($newsletter->target_users) && empty($newsletter->target_organizations)) {
                // Old system - use NewsletterRecipient
                $recipients = NewsletterRecipient::active()->get();

                if ($recipients->isEmpty()) {
                    $newsletter->update(['status' => 'failed']);
                    $this->error("No active recipients found for newsletter {$newsletter->id}");
                    return;
                }

                // Create email records
                foreach ($recipients as $recipient) {
                    NewsletterEmail::create([
                        'newsletter_id' => $newsletter->id,
                        'newsletter_recipient_id' => $recipient->id,
                        'email' => $recipient->email,
                        'status' => 'pending',
                    ]);
                }

                $this->info("Newsletter {$newsletter->id} dispatched to queue for {$recipients->count()} recipients.");
            } else {
                // New targeting system - let the job handle recipient creation
                $this->info("Newsletter {$newsletter->id} using new targeting system, dispatching to job.");
            }

            // Dispatch job to send emails
            dispatch(new SendNewsletterJob($newsletter));

        } catch (\Exception $e) {
            Log::error("Failed to process scheduled newsletter {$newsletter->id}: " . $e->getMessage());
            $newsletter->update(['status' => 'failed']);
            $this->error("Failed to process newsletter {$newsletter->id}: " . $e->getMessage());
        }
    }
}
