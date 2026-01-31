<?php

namespace App\Jobs;

use App\Models\Newsletter;
use App\Models\NewsletterEmail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

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
        // Load organization relationship to avoid N+1 queries
        $this->newsletter->load('organization');
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

            // Check total email records
            $totalEmails = NewsletterEmail::where('newsletter_id', $this->newsletter->id)->count();
            
            if ($totalEmails === 0) {
                // No email records were created - this is an error
                Log::error("No email records created for newsletter {$this->newsletter->id}. Newsletter will be marked as failed.", [
                    'newsletter_id' => $this->newsletter->id,
                    'target_type' => $this->newsletter->target_type,
                    'target_users' => $this->newsletter->target_users,
                    'target_organizations' => $this->newsletter->target_organizations,
                ]);
                $this->newsletter->update(['status' => 'failed']);
                throw new \Exception("No email records could be created for newsletter. Please check your targeting settings and ensure there are recipients available.");
            }

            if ($pendingEmails->isEmpty()) {
                // Check if all emails are processed
                $processedEmails = NewsletterEmail::where('newsletter_id', $this->newsletter->id)
                    ->whereIn('status', ['sent', 'delivered', 'bounced', 'failed'])
                    ->count();

                if ($processedEmails >= $totalEmails) {
                    // All emails processed, update newsletter status to sent
                    // Use UTC for database storage
                    $this->newsletter->update([
                        'status' => 'sent',
                        'sent_at' => Carbon::now('UTC')
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
                // Use UTC for delay calculation
                SendNewsletterJob::dispatch($this->newsletter)->delay(Carbon::now('UTC')->addSeconds(30));
                Log::info("Newsletter {$this->newsletter->id} has {$remainingCount} remaining emails, dispatching next batch.");
            } else {
                // All emails sent
                // Use UTC for database storage
                $this->newsletter->update([
                    'status' => 'sent',
                    'sent_at' => Carbon::now('UTC')
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
            Log::info("Email records already exist for newsletter {$this->newsletter->id} ({$existingCount} records)");
            return; // Email records already exist
        }

        Log::info("Creating email records for newsletter {$this->newsletter->id}", [
            'target_type' => $this->newsletter->target_type,
            'target_users' => $this->newsletter->target_users,
            'target_organizations' => $this->newsletter->target_organizations,
        ]);

        // For backward compatibility: if target_type is 'all' and no specific targets, try old NewsletterRecipient system first
        // If no NewsletterRecipient records exist, fall back to new system (all verified users)
        if ($this->newsletter->target_type === 'all' && 
            empty($this->newsletter->target_users) && 
            empty($this->newsletter->target_organizations) && 
            empty($this->newsletter->target_roles)) {
            
            Log::info("Checking NewsletterRecipient system for newsletter {$this->newsletter->id}");
            $recipients = \App\Models\NewsletterRecipient::active()->get();
            
            if ($recipients->isNotEmpty()) {
                // Use old system if recipients exist
                Log::info("Using old NewsletterRecipient system for newsletter {$this->newsletter->id} ({$recipients->count()} recipients)");
                foreach ($recipients as $recipient) {
                    NewsletterEmail::create([
                        'newsletter_id' => $this->newsletter->id,
                        'newsletter_recipient_id' => $recipient->id,
                        'email' => $recipient->email,
                        'status' => 'pending',
                    ]);
                }
                Log::info("Created {$recipients->count()} email records using NewsletterRecipient system");
                return;
            } else {
                // Fall back to new system - get all verified users
                Log::info("No NewsletterRecipient records found, falling back to new targeting system (all verified users)");
            }
        }

        // Get targeted users based on newsletter targeting settings (new system)
        $targetedUsers = $this->newsletter->getTargetedUsers();

        if ($targetedUsers->isEmpty()) {
            Log::error("No targeted users found for newsletter {$this->newsletter->id}", [
                'target_type' => $this->newsletter->target_type,
                'target_users' => $this->newsletter->target_users,
                'target_organizations' => $this->newsletter->target_organizations,
                'target_roles' => $this->newsletter->target_roles,
            ]);
            throw new \Exception("No targeted users found for newsletter. Please check your targeting settings and ensure there are users with verified emails available.");
        }
        
        Log::info("Found {$targetedUsers->count()} targeted users for newsletter {$this->newsletter->id}");

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
            $userId = null;
            $organizationId = null;

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
                $userId = $metadata['user_id'] ?? null;
                $organizationId = $metadata['organization_id'] ?? null;
                
                // Get user if available for more data - ALWAYS use real user data
                if ($userId) {
                    $user = \App\Models\User::find($userId);
                    if ($user) {
                        $recipientName = $user->name ?? 'Subscriber';
                        $recipientEmail = $user->email ?? $emailRecord->email;
                        Log::info("Using real user data for newsletter email", [
                            'user_id' => $userId,
                            'user_name' => $recipientName,
                            'user_email' => $recipientEmail,
                            'newsletter_id' => $this->newsletter->id
                        ]);
                    } else {
                        Log::warning("User ID {$userId} not found for newsletter email", [
                            'newsletter_id' => $this->newsletter->id,
                            'email_record_id' => $emailRecord->id
                        ]);
                    }
                } else {
                    Log::warning("No user_id in metadata for newsletter email", [
                        'newsletter_id' => $this->newsletter->id,
                        'email_record_id' => $emailRecord->id,
                        'metadata' => $metadata
                    ]);
                }
                
                $unsubscribeLink = route('newsletter.unsubscribe', 'token_' . uniqid()); // Generate temp token
            }

            // Get organization data - MUST use real data, not demo data
            $organization = null;
            
            // First, try to get from newsletter's organization (should be set when newsletter is created)
            if ($this->newsletter->organization_id) {
                $organization = $this->newsletter->organization;
                Log::info("Using newsletter's organization", [
                    'newsletter_id' => $this->newsletter->id,
                    'organization_id' => $organization->id ?? null,
                ]);
            }
            
            // If newsletter doesn't have organization, get from the recipient user's organization
            if (!$organization && $userId) {
                $user = \App\Models\User::find($userId);
                if ($user && $user->organization) {
                    $organization = $user->organization;
                    Log::info("Using recipient's organization for newsletter", [
                        'newsletter_id' => $this->newsletter->id,
                        'user_id' => $userId,
                        'organization_id' => $organization->id,
                        'organization_name' => $organization->name
                    ]);
                }
            }
            
            // If still no organization, get from the first targeted user's organization
            if (!$organization) {
                $targetedUsers = $this->newsletter->getTargetedUsers();
                foreach ($targetedUsers as $user) {
                    if ($user->organization) {
                        $organization = $user->organization;
                        Log::info("Using first targeted user's organization for newsletter", [
                            'newsletter_id' => $this->newsletter->id,
                            'organization_id' => $organization->id,
                            'organization_name' => $organization->name
                        ]);
                        break;
                    }
                }
            }
            
            // Set organization data - MUST use real data, NO demo/fallback values
            if ($organization) {
                // Get REAL organization data
                $orgName = $organization->name ?? '';
                $orgEmail = $organization->email ?? ($organization->user->email ?? '');
                $orgPhone = $organization->phone ?? ($organization->user->contact_number ?? '');
                
                // Build organization address from REAL data
                $addressParts = array_filter([
                    $organization->street ?? null,
                    $organization->city ?? null,
                    $organization->state ?? null,
                    $organization->zip ?? null
                ]);
                $orgAddress = !empty($addressParts) ? implode(', ', $addressParts) : '';
                
                Log::info("Using REAL organization data for newsletter email", [
                    'newsletter_id' => $this->newsletter->id,
                    'organization_id' => $organization->id,
                    'organization_name' => $orgName,
                    'organization_email' => $orgEmail,
                    'organization_phone' => $orgPhone,
                    'organization_address' => $orgAddress
                ]);
            } else {
                // CRITICAL ERROR: No organization found - this should NOT happen
                // But we'll still try to get organization from metadata or use empty strings instead of demo data
                Log::error("CRITICAL: NO ORGANIZATION FOUND for newsletter", [
                    'newsletter_id' => $this->newsletter->id,
                    'newsletter_organization_id' => $this->newsletter->organization_id,
                    'user_id' => $userId,
                    'metadata' => $emailRecord->metadata ?? []
                ]);
                
                // Use empty strings instead of demo data - let the template handle missing data
                $orgName = '';
                $orgEmail = '';
                $orgPhone = '';
                $orgAddress = '';
            }

            // Get user's timezone for date formatting
            $userTimezone = 'UTC';
            if ($userId) {
                $user = \App\Models\User::find($userId);
                $userTimezone = $user->timezone ?? 'UTC';
            }

            // Prepare email data with all available variables
            $emailData = [
                'subject' => $this->newsletter->subject,
                'content' => $this->newsletter->content,
                'html_content' => $this->newsletter->html_content,
                'recipient_name' => $recipientName,
                'recipient_email' => $recipientEmail,
                'organization_name' => $orgName,
                'organization_email' => $orgEmail,
                'organization_phone' => $orgPhone,
                'organization_address' => $orgAddress,
                'unsubscribe_link' => $unsubscribeLink,
                'public_view_link' => route('newsletter.show', $this->newsletter->id),
                'current_date' => \Carbon\Carbon::now($userTimezone)->format('F j, Y'),
                'current_year' => (string) \Carbon\Carbon::now($userTimezone)->year,
            ];

            // Replace variables in subject and content
            $processedSubject = $this->processContent($emailData, false, true);
            $processedContent = $this->processContent($emailData, false, false);
            $processedHtmlContent = $this->processContent($emailData, true, false);

            // Send email using a simple HTML template
            Mail::send([], [], function ($message) use ($emailData, $emailRecord, $processedSubject, $processedContent, $processedHtmlContent) {
                $message->to($emailData['recipient_email'], $emailData['recipient_name'])
                        ->subject($processedSubject) // Use processed subject with variables replaced
                        ->html($processedHtmlContent)
                        ->text($processedContent);
            });

            // Update email record - use UTC for database storage
            $emailRecord->update([
                'status' => 'sent',
                'sent_at' => Carbon::now('UTC'),
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
    protected function processContent(array $data, bool $isHtml = false, bool $isSubject = false): string
    {
        // Get the appropriate content based on type
        if ($isSubject) {
            $content = $data['subject'] ?? '';
        } else {
            $content = $isHtml ? ($data['html_content'] ?? '') : ($data['content'] ?? '');
        }

        // All available variables with their replacements
        $replacements = [
            '{organization_name}' => $data['organization_name'] ?? '',
            '{organization_email}' => $data['organization_email'] ?? '',
            '{organization_phone}' => $data['organization_phone'] ?? '',
            '{organization_address}' => $data['organization_address'] ?? '',
            '{recipient_name}' => $data['recipient_name'] ?? '',
            '{recipient_email}' => $data['recipient_email'] ?? '',
            '{unsubscribe_link}' => $data['unsubscribe_link'] ?? '#',
            '{public_view_link}' => $data['public_view_link'] ?? '#',
            '{current_date}' => $data['current_date'] ?? '',
            '{current_year}' => $data['current_year'] ?? '',
        ];

        // Replace all variables
        $processed = str_replace(array_keys($replacements), array_values($replacements), $content);

        return $processed;
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
