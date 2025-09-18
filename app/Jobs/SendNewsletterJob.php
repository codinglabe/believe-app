<?php

namespace App\Jobs;

use App\Models\Newsletter;
use App\Models\NewsletterEmail;
use App\Models\NewsletterRecipient;
use App\Models\User;
use App\Models\Organization;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class SendNewsletterJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $newsletter;
    protected $batchSize = 50; // Send 50 emails per batch

    /**
     * Create a new job instance.
     */
    public function __construct(Newsletter $newsletter)
    {
        $this->newsletter = $newsletter;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            // Ensure newsletter is in sending status
            if ($this->newsletter->status !== 'sending') {
                Log::info("Newsletter {$this->newsletter->id} is not in sending status, skipping job.");
                return;
            }

            // Check if we need to create email records for targeted users
            $this->createEmailRecordsIfNeeded();

            // Get pending emails for this newsletter
            $pendingEmails = NewsletterEmail::where('newsletter_id', $this->newsletter->id)
                ->where('status', 'pending')
                ->limit($this->batchSize)
                ->get();

            if ($pendingEmails->isEmpty()) {
                // Check if all emails are processed
                $totalEmails = NewsletterEmail::where('newsletter_id', $this->newsletter->id)->count();
                $processedEmails = NewsletterEmail::where('newsletter_id', $this->newsletter->id)
                    ->whereIn('status', ['sent', 'delivered', 'bounced', 'failed'])
                    ->count();

                if ($totalEmails > 0 && $processedEmails >= $totalEmails) {
                    // All emails processed, update newsletter status to sent
                    $this->newsletter->update([
                        'status' => 'sent',
                        'sent_at' => now()
                    ]);
                    Log::info("Newsletter {$this->newsletter->id} completed sending to all recipients.");
                }
                return;
            }

            // Send emails in this batch
            foreach ($pendingEmails as $emailRecord) {
                $this->sendEmail($emailRecord);
            }

            // Update newsletter stats
            $this->updateNewsletterStats();

            // Dispatch next batch if there are more pending emails
            $remainingCount = NewsletterEmail::where('newsletter_id', $this->newsletter->id)
                ->where('status', 'pending')
                ->count();

            if ($remainingCount > 0) {
                // Delay next batch by 30 seconds to avoid rate limiting
                SendNewsletterJob::dispatch($this->newsletter)->delay(now()->addSeconds(30));
                Log::info("Newsletter {$this->newsletter->id} has {$remainingCount} remaining emails, dispatching next batch.");
            } else {
                // All emails sent
                $this->newsletter->update([
                    'status' => 'sent',
                    'sent_at' => now()
                ]);
                Log::info("Newsletter {$this->newsletter->id} completed sending to all recipients.");
            }

        } catch (\Exception $e) {
            Log::error('Newsletter sending failed: ' . $e->getMessage(), [
                'newsletter_id' => $this->newsletter->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            $this->newsletter->update(['status' => 'failed']);
            throw $e;
        }
    }

    /**
     * Create email records for targeted users if not already created
     */
    protected function createEmailRecordsIfNeeded(): void
    {
        // Check if email records already exist
        $existingCount = NewsletterEmail::where('newsletter_id', $this->newsletter->id)->count();
        
        if ($existingCount > 0) {
            return; // Email records already exist
        }

        Log::info("Creating email records for newsletter {$this->newsletter->id} with target type: {$this->newsletter->target_type}");

        // Get targeted users based on newsletter targeting settings
        $targetedUsers = $this->newsletter->getTargetedUsers();
        
        if ($targetedUsers->isEmpty()) {
            Log::warning("No targeted users found for newsletter {$this->newsletter->id}");
            return;
        }

        // Create email records for each targeted user
        foreach ($targetedUsers as $user) {
            NewsletterEmail::create([
                'newsletter_id' => $this->newsletter->id,
                'newsletter_recipient_id' => null, // We're targeting users directly
                'email' => $user->email,
                'status' => 'pending',
                'metadata' => [
                    'user_id' => $user->id,
                    'user_name' => $user->name,
                    'target_type' => 'user'
                ]
            ]);
        }

        // Also create records for targeted organizations if applicable
        if ($this->newsletter->target_type === 'organizations' || $this->newsletter->target_type === 'specific') {
            $targetedOrganizations = $this->newsletter->getTargetedOrganizations();
            
            foreach ($targetedOrganizations as $organization) {
                if ($organization->email) {
                    NewsletterEmail::create([
                        'newsletter_id' => $this->newsletter->id,
                        'newsletter_recipient_id' => null,
                        'email' => $organization->email,
                        'status' => 'pending',
                        'metadata' => [
                            'organization_id' => $organization->id,
                            'organization_name' => $organization->name,
                            'target_type' => 'organization'
                        ]
                    ]);
                }
            }
        }

        Log::info("Created email records for newsletter {$this->newsletter->id}");
    }

    /**
     * Send individual email
     */
    protected function sendEmail(NewsletterEmail $emailRecord): void
    {
        try {
            // Get recipient info from metadata or recipient relationship
            $recipientName = 'Subscriber';
            $recipientEmail = $emailRecord->email;
            $unsubscribeLink = '#';
            
            if ($emailRecord->recipient) {
                // Traditional recipient system
                $recipient = $emailRecord->recipient;
                if ($recipient->status !== 'active') {
                    $emailRecord->update([
                        'status' => 'failed',
                        'error_message' => 'Recipient is not active'
                    ]);
                    return;
                }
                $recipientName = $recipient->name ?? 'Subscriber';
                $unsubscribeLink = route('newsletter.unsubscribe', $recipient->unsubscribe_token);
            } else {
                // New targeting system - get info from metadata
                $metadata = $emailRecord->metadata ?? [];
                $recipientName = $metadata['user_name'] ?? $metadata['organization_name'] ?? 'Subscriber';
                $unsubscribeLink = route('newsletter.unsubscribe', 'token_' . uniqid()); // Generate temp token
            }

            // Prepare email data
            $emailData = [
                'subject' => $this->newsletter->subject,
                'content' => $this->newsletter->content,
                'html_content' => $this->newsletter->html_content,
                'recipient_name' => $recipientName,
                'recipient_email' => $recipientEmail,
                'organization_name' => $this->newsletter->organization->name ?? 'Our Organization',
                'unsubscribe_link' => $unsubscribeLink,
                'current_date' => now()->format('F j, Y')
            ];

            // Replace variables in content
            $processedContent = $this->processContent($emailData);
            $processedHtmlContent = $this->processContent($emailData, true);

            // Send email using a simple HTML template
            Mail::send([], [], function ($message) use ($emailData, $emailRecord, $processedContent, $processedHtmlContent) {
                $message->to($emailData['recipient_email'], $emailData['recipient_name'])
                        ->subject($emailData['subject'])
                        ->html($processedHtmlContent)
                        ->text($processedContent);
            });

            // Update email record
            $emailRecord->update([
                'status' => 'sent',
                'sent_at' => now(),
                'message_id' => 'msg_' . uniqid() // Generate unique message ID
            ]);

            Log::info("Email sent successfully to {$emailData['recipient_email']} for newsletter {$this->newsletter->id}");

        } catch (\Exception $e) {
            Log::error('Failed to send email to ' . $emailRecord->email . ': ' . $e->getMessage(), [
                'newsletter_id' => $this->newsletter->id,
                'email_id' => $emailRecord->id,
                'error' => $e->getMessage()
            ]);
            
            $emailRecord->update([
                'status' => 'failed',
                'error_message' => $e->getMessage()
            ]);
        }
    }

    /**
     * Process content with variables
     */
    protected function processContent(array $data, bool $isHtml = false): string
    {
        $content = $isHtml ? $data['html_content'] : $data['content'];
        
        $replacements = [
            '{organization_name}' => $data['organization_name'],
            '{recipient_name}' => $data['recipient_name'],
            '{unsubscribe_link}' => $data['unsubscribe_link'],
            '{current_date}' => $data['current_date']
        ];

        return str_replace(array_keys($replacements), array_values($replacements), $content);
    }

    /**
     * Update newsletter statistics
     */
    protected function updateNewsletterStats(): void
    {
        $stats = NewsletterEmail::where('newsletter_id', $this->newsletter->id)
            ->selectRaw('
                COUNT(*) as total,
                SUM(CASE WHEN status = "sent" THEN 1 ELSE 0 END) as sent,
                SUM(CASE WHEN status = "delivered" THEN 1 ELSE 0 END) as delivered,
                SUM(CASE WHEN status = "opened" THEN 1 ELSE 0 END) as opened,
                SUM(CASE WHEN status = "clicked" THEN 1 ELSE 0 END) as clicked,
                SUM(CASE WHEN status = "bounced" THEN 1 ELSE 0 END) as bounced
            ')
            ->first();

        $this->newsletter->update([
            'sent_count' => $stats->sent,
            'delivered_count' => $stats->delivered,
            'opened_count' => $stats->opened,
            'clicked_count' => $stats->clicked,
            'bounced_count' => $stats->bounced
        ]);
    }
}