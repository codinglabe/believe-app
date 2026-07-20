<?php

namespace App\Jobs;

use App\Models\EmailConnection;
use App\Models\EmailContact;
use App\Models\Organization;
use App\Models\User;
use App\Services\GmailService;
use App\Services\OutlookService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SyncEmailContacts implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $timeout = 300; // 5 minutes timeout for large syncs

    /**
     * Create a new job instance.
     */
    public function __construct(
        public EmailConnection $emailConnection,
        public Organization $organization
    ) {
        //
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            // Refresh the connection to get latest state
            $this->emailConnection->refresh();

            if ($this->emailConnection->provider === 'gmail') {
                $service = new GmailService($this->emailConnection);
                // Google Contacts only (contacts.readonly) — no Gmail inbox / recent-sender scan.
                $contacts = $service->getContacts();
            } else {
                $service = new OutlookService($this->emailConnection);
                $contacts = $service->getContacts();
                $senders = $service->getRecentSenders(1000);
                $contacts = array_merge($contacts, $senders);
            }

            // Remove duplicates by email
            $uniqueContacts = [];
            $seenEmails = [];
            foreach ($contacts as $contact) {
                $email = strtolower($contact['email']);
                if (!in_array($email, $seenEmails)) {
                    $seenEmails[] = $email;
                    $uniqueContacts[] = $contact;
                }
            }

            // Store contacts and mark registered vs unregistered on the platform
            $syncedCount = 0;
            $emails = array_map(
                static fn (array $c) => strtolower(trim((string) ($c['email'] ?? ''))),
                $uniqueContacts
            );
            $emails = array_values(array_filter($emails));
            $registeredEmails = User::query()
                ->whereIn('email', $emails)
                ->pluck('email')
                ->map(static fn ($email) => strtolower((string) $email))
                ->all();
            $registeredLookup = array_fill_keys($registeredEmails, true);

            foreach ($uniqueContacts as $contactData) {
                $email = strtolower(trim((string) ($contactData['email'] ?? '')));
                $isRegistered = $email !== '' && isset($registeredLookup[$email]);

                EmailContact::updateOrCreate(
                    [
                        'email_connection_id' => $this->emailConnection->id,
                        'organization_id' => $this->organization->id,
                        'email' => $contactData['email'],
                    ],
                    [
                        'name' => $contactData['name'],
                        'provider_contact_id' => $contactData['provider_contact_id'],
                        'metadata' => $contactData['metadata'],
                        'has_joined' => $isRegistered,
                        'joined_at' => $isRegistered ? now() : null,
                    ]
                );
                $syncedCount++;
            }

            // Update connection - mark as not syncing and update last_synced_at
            $this->emailConnection->update([
                'is_syncing' => false,
                'last_synced_at' => now(),
            ]);

            Log::info("Synced {$syncedCount} contacts for connection {$this->emailConnection->id}");
        } catch (\Exception $e) {
            // Mark as not syncing on error
            $this->emailConnection->update(['is_syncing' => false]);
            Log::error('Sync contacts job error: ' . $e->getMessage());
            throw $e; // Re-throw to trigger retry mechanism
        }
    }
}

