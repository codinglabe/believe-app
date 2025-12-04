<?php

namespace App\Console\Commands;

use App\Models\EmailConnection;
use App\Models\EmailContact;
use App\Services\GmailService;
use App\Services\OutlookService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SyncEmailContacts extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'email:sync-contacts 
                            {--organization= : Organization ID to sync contacts for}
                            {--connection= : Email connection ID to sync}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync contacts from connected email accounts (Gmail/Outlook)';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $organizationId = $this->option('organization');
        $connectionId = $this->option('connection');

        if ($connectionId) {
            $connections = EmailConnection::where('id', $connectionId)->get();
        } elseif ($organizationId) {
            $connections = EmailConnection::where('organization_id', $organizationId)
                ->where('is_active', true)
                ->get();
        } else {
            $connections = EmailConnection::where('is_active', true)->get();
        }

        if ($connections->isEmpty()) {
            $this->warn('No active email connections found.');
            return 0;
        }

        $this->info("Found {$connections->count()} email connection(s) to sync.");

        foreach ($connections as $connection) {
            $this->info("Syncing contacts for {$connection->provider} account: {$connection->email}");

            try {
                if ($connection->provider === 'gmail') {
                    $service = new GmailService($connection);
                    $contacts = $service->getContacts(); // May return empty if People API not enabled
                    $senders = $service->getRecentSenders(1000); // Fetch up to 1000 to ensure 100% coverage
                    $contacts = array_merge($contacts, $senders);
                    
                    if (empty($contacts) && empty($senders)) {
                        $this->warn("⚠ No contacts found. Make sure Gmail API is enabled in Google Cloud Console.");
                    } elseif (empty($contacts) && !empty($senders)) {
                        $this->info("ℹ People API not available - using recent senders only. Enable People API for full contact list.");
                    }
                } else {
                    $service = new OutlookService($connection);
                    $contacts = $service->getContacts();
                    $senders = $service->getRecentSenders(1000); // Fetch up to 1000 to ensure 100% coverage
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

                // Store contacts
                $syncedCount = 0;
                foreach ($uniqueContacts as $contactData) {
                    EmailContact::updateOrCreate(
                        [
                            'email_connection_id' => $connection->id,
                            'organization_id' => $connection->organization_id,
                            'email' => $contactData['email'],
                        ],
                        [
                            'name' => $contactData['name'],
                            'provider_contact_id' => $contactData['provider_contact_id'],
                            'metadata' => $contactData['metadata'],
                        ]
                    );
                    $syncedCount++;
                }

                $connection->update(['last_synced_at' => now()]);

                $this->info("✓ Synced {$syncedCount} contacts for {$connection->email}");
            } catch (\Exception $e) {
                $this->error("✗ Failed to sync contacts for {$connection->email}: " . $e->getMessage());
                Log::error("Sync contacts error for connection {$connection->id}: " . $e->getMessage());
            }
        }

        $this->info('Contact sync completed!');
        return 0;
    }
}
