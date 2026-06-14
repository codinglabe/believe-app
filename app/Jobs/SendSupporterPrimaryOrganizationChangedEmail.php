<?php

namespace App\Jobs;

use App\Mail\SupporterPrimaryOrganizationChangedMail;
use App\Models\Organization;
use App\Models\SupporterPrimaryOrganizationChange;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendSupporterPrimaryOrganizationChangedEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 120;

    /** @var array<int, int> */
    public array $backoff = [10, 30, 60];

    public function __construct(
        public int $changeId,
    ) {
        $this->onQueue('mail');
    }

    public function handle(): void
    {
        $change = SupporterPrimaryOrganizationChange::query()
            ->with(['newOrganization:id,name', 'user:id,name,email'])
            ->find($this->changeId);

        if ($change === null) {
            Log::warning('Primary org change email skipped: change log not found', [
                'change_id' => $this->changeId,
            ]);

            return;
        }

        if ($change->previous_organization_id === null) {
            return;
        }

        $organization = Organization::query()
            ->with('user:id,email')
            ->find($change->previous_organization_id);

        if ($organization === null) {
            Log::warning('Primary org change email skipped: previous organization not found', [
                'change_id' => $change->id,
                'previous_organization_id' => $change->previous_organization_id,
            ]);

            return;
        }

        $supporter = $change->user;
        if ($supporter === null) {
            Log::warning('Primary org change email skipped: supporter not found', [
                'change_id' => $change->id,
                'user_id' => $change->user_id,
            ]);

            return;
        }

        $recipient = $this->resolveRecipientEmail($organization);
        if ($recipient === null) {
            Log::warning('Primary org change email skipped: no recipient email on organization', [
                'change_id' => $change->id,
                'organization_id' => $organization->id,
            ]);

            return;
        }

        $dashboardUrl = route('organization.supporters.index');

        try {
            Mail::to($recipient)->send(new SupporterPrimaryOrganizationChangedMail(
                $organization,
                $supporter,
                $change,
                $dashboardUrl,
            ));

            Log::info('Primary org change notification email sent', [
                'change_id' => $change->id,
                'organization_id' => $organization->id,
                'recipient' => $recipient,
            ]);
        } catch (\Throwable $e) {
            Log::error('Failed to send primary org change notification email', [
                'change_id' => $change->id,
                'organization_id' => $organization->id,
                'recipient' => $recipient,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    private function resolveRecipientEmail(Organization $organization): ?string
    {
        foreach ([$organization->email, $organization->platform_email, $organization->user?->email] as $candidate) {
            $email = trim((string) $candidate);
            if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL) !== false) {
                return $email;
            }
        }

        return null;
    }
}
