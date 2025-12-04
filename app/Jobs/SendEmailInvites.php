<?php

namespace App\Jobs;

use App\Mail\EmailInvite;
use App\Models\EmailContact;
use App\Models\Organization;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendEmailInvites implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $timeout = 120;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public $contacts,
        public Organization $organization,
        public ?string $customMessage = null
    ) {
        // Ensure contacts is a collection for proper serialization
        if (is_array($this->contacts)) {
            $this->contacts = collect($this->contacts);
        }
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $contacts = $this->contacts;
        
        // Ensure we have a collection
        if (!($contacts instanceof \Illuminate\Support\Collection)) {
            $contacts = collect($contacts);
        }
        
        $sentCount = 0;
        $failedCount = 0;
        
        foreach ($contacts as $contact) {
            try {
                // If contact is already a model, use it directly; otherwise load from DB
                if ($contact instanceof EmailContact) {
                    $contactModel = $contact;
                } else {
                    $contactId = is_array($contact) ? ($contact['id'] ?? null) : ($contact->id ?? null);
                    if (!$contactId) {
                        Log::warning("Contact ID not found, skipping");
                        $failedCount++;
                        continue;
                    }
                    $contactModel = EmailContact::find($contactId);
                    if (!$contactModel) {
                        Log::warning("Contact not found with ID: {$contactId}");
                        $failedCount++;
                        continue;
                    }
                }
                
                // Skip if already sent
                if ($contactModel->invite_sent) {
                    Log::info("Invite already sent to {$contactModel->email}, skipping");
                    continue;
                }
                
                Mail::to($contactModel->email)->send(
                    new EmailInvite($this->organization, $contactModel, $this->customMessage)
                );

                $contactModel->update([
                    'invite_sent' => true,
                    'invite_sent_at' => now(),
                ]);

                $sentCount++;
                Log::info("Email invite sent to {$contactModel->email} for organization {$this->organization->id}");
            } catch (\Exception $e) {
                $email = $contact->email ?? (is_array($contact) ? ($contact['email'] ?? 'unknown') : 'unknown');
                Log::error("Failed to send invite to {$email}: " . $e->getMessage());
                $failedCount++;
                // Continue with other contacts even if one fails
            }
        }
        
        Log::info("Email invites job completed. Sent: {$sentCount}, Failed: {$failedCount}");
    }
}
