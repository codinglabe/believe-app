<?php

namespace App\Console\Commands;

use App\Jobs\SendEmailInvites;
use App\Models\EmailContact;
use App\Models\Organization;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SendEmailInvitesCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'email:send-invites 
                            {--organization= : Organization ID to send invites for}
                            {--contact= : Specific contact ID to send invite to}
                            {--all : Send invites to all unsent contacts}
                            {--message= : Custom message to include in invite}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send email invites to contacts for organizations';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $organizationId = $this->option('organization');
        $contactId = $this->option('contact');
        $sendAll = $this->option('all');
        $customMessage = $this->option('message');

        if (!$organizationId && !$contactId && !$sendAll) {
            $this->error('Please specify --organization, --contact, or --all option.');
            return 1;
        }

        if ($contactId) {
            $contact = EmailContact::find($contactId);
            if (!$contact) {
                $this->error("Contact with ID {$contactId} not found.");
                return 1;
            }

            if ($contact->invite_sent) {
                $this->warn("Invite already sent to {$contact->email}.");
                return 0;
            }

            $organization = $contact->organization;
            $contacts = collect([$contact]);
        } elseif ($organizationId) {
            $organization = Organization::find($organizationId);
            if (!$organization) {
                $this->error("Organization with ID {$organizationId} not found.");
                return 1;
            }

            $contacts = $organization->emailContacts()
                ->where('invite_sent', false)
                ->get();
        } else {
            // Send to all organizations
            $organizations = Organization::all();
            $totalSent = 0;

            foreach ($organizations as $organization) {
                $contacts = $organization->emailContacts()
                    ->where('invite_sent', false)
                    ->get();

                if ($contacts->isEmpty()) {
                    continue;
                }

                $this->info("Sending invites for organization: {$organization->name} ({$contacts->count()} contacts)");
                SendEmailInvites::dispatch($contacts, $organization, $customMessage);
                $totalSent += $contacts->count();
            }

            $this->info("Queued {$totalSent} invite(s) for all organizations.");
            return 0;
        }

        if ($contacts->isEmpty()) {
            $this->warn('No contacts found to send invites to.');
            return 0;
        }

        $this->info("Sending invites for organization: {$organization->name} ({$contacts->count()} contact(s))");

        try {
            SendEmailInvites::dispatch($contacts, $organization, $customMessage);
            $this->info("✓ Queued {$contacts->count()} invite(s) successfully.");
        } catch (\Exception $e) {
            $this->error("✗ Failed to queue invites: " . $e->getMessage());
            Log::error("Send email invites error: " . $e->getMessage());
            return 1;
        }

        return 0;
    }
}
