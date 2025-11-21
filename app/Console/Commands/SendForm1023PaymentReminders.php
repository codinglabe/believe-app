<?php

namespace App\Console\Commands;

use App\Models\Form1023Application;
use App\Mail\Form1023PaymentReminder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class SendForm1023PaymentReminders extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'form1023:send-payment-reminders';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send daily payment reminders to organizations with unpaid Form 1023 applications';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting Form 1023 payment reminder process...');

        // Get applications with pending payment
        $applications = Form1023Application::where('payment_status', 'pending')
            ->whereIn('status', ['draft', 'pending_payment'])
            ->with('organization')
            ->get();

        if ($applications->isEmpty()) {
            $this->info('No applications with pending payment found.');
            return 0;
        }

        $this->info("Found {$applications->count()} application(s) with pending payment.");

        $sentCount = 0;
        $skippedCount = 0;
        $errorCount = 0;

        foreach ($applications as $application) {
            try {
                // Check if organization exists and has email
                if (!$application->organization) {
                    $this->warn("Application {$application->application_number} has no organization. Skipping.");
                    $skippedCount++;
                    continue;
                }

                // Get organization email (prefer organization email, fallback to user email)
                $email = $application->organization->email;
                if (!$email && $application->organization->user) {
                    $email = $application->organization->user->email;
                }

                if (!$email) {
                    $this->warn("No email found for organization {$application->organization->id} (Application: {$application->application_number}). Skipping.");
                    $skippedCount++;
                    continue;
                }

                // Check if we sent a reminder today already
                $meta = $application->meta ?? [];
                $lastReminderSent = isset($meta['last_payment_reminder_sent']) 
                    ? Carbon::parse($meta['last_payment_reminder_sent']) 
                    : null;

                // Only send if we haven't sent today (allow one reminder per day)
                if ($lastReminderSent && $lastReminderSent->isToday()) {
                    $this->info("Reminder already sent today for application {$application->application_number}. Skipping.");
                    $skippedCount++;
                    continue;
                }

                // Send the email
                Mail::to($email)->send(new Form1023PaymentReminder($application));

                // Update meta to track last reminder sent
                $meta['last_payment_reminder_sent'] = now()->toIso8601String();
                $application->meta = $meta;
                $application->save();

                $this->info("✓ Payment reminder sent to {$email} for application {$application->application_number}");
                $sentCount++;

                Log::info('Form 1023 payment reminder sent', [
                    'application_id' => $application->id,
                    'application_number' => $application->application_number,
                    'organization_id' => $application->organization_id,
                    'email' => $email,
                ]);

            } catch (\Exception $e) {
                $this->error("✗ Failed to send reminder for application {$application->application_number}: {$e->getMessage()}");
                $errorCount++;

                Log::error('Failed to send Form 1023 payment reminder', [
                    'application_id' => $application->id,
                    'application_number' => $application->application_number,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
            }
        }

        $this->info("\n=== Summary ===");
        $this->info("Reminders sent: {$sentCount}");
        $this->info("Skipped: {$skippedCount}");
        $this->info("Errors: {$errorCount}");
        $this->info("\nPayment reminder process completed.");

        return 0;
    }
}



