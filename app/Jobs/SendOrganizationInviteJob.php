<?php

namespace App\Jobs;

use App\Mail\OrganizationInviteMail;
use App\Models\OrganizationInvite;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendOrganizationInviteJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $timeout = 120;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public OrganizationInvite $invite
    ) {
        //
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            // Reload the invite to ensure we have the latest data
            $invite = OrganizationInvite::find($this->invite->id);
            
            if (!$invite) {
                Log::error('Organization invite not found', [
                    'invite_id' => $this->invite->id,
                ]);
                return;
            }

            // Check if already sent or accepted
            if ($invite->status === 'sent' || $invite->status === 'accepted') {
                Log::info('Organization invite already processed', [
                    'invite_id' => $invite->id,
                    'status' => $invite->status,
                ]);
                return;
            }

            // Load relationships
            $invite->load(['inviter', 'excelData']);

            if (!$invite->inviter) {
                Log::error('Inviter not found for organization invite', [
                    'invite_id' => $invite->id,
                ]);
                return;
            }

            // Send the email
            Mail::to($invite->email)->send(
                new OrganizationInviteMail(
                    $invite->organization_name,
                    $invite->email,
                    $invite->inviter,
                    $invite->ein,
                    $invite
                )
            );

            // Update invite status
            $invite->update([
                'status' => 'sent',
                'sent_at' => now(),
            ]);

            Log::info('Organization invite email sent successfully', [
                'invite_id' => $invite->id,
                'email' => $invite->email,
                'organization_name' => $invite->organization_name,
                'inviter_id' => $invite->inviter_id,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to send organization invite email', [
                'invite_id' => $this->invite->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            // Re-throw to trigger retry mechanism
            throw $e;
        }
    }
}
