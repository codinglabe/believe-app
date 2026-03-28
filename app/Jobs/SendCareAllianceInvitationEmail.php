<?php

namespace App\Jobs;

use App\Mail\CareAllianceInvitationMail;
use App\Models\CareAllianceInvitation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendCareAllianceInvitationEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;

    public $timeout = 120;

    public function __construct(
        public int $invitationId
    ) {}

    public function handle(): void
    {
        $invitation = CareAllianceInvitation::query()
            ->with(['careAlliance', 'organization.user', 'invitedBy'])
            ->find($this->invitationId);

        if (! $invitation) {
            Log::warning('Care Alliance invitation not found for mail job', [
                'invitation_id' => $this->invitationId,
            ]);

            return;
        }

        if ($invitation->status !== 'pending') {
            Log::info('Care Alliance invitation no longer pending; skipping email', [
                'invitation_id' => $invitation->id,
                'status' => $invitation->status,
            ]);

            return;
        }

        $to = $this->resolveRecipientEmail($invitation);
        if (! $to || ! filter_var($to, FILTER_VALIDATE_EMAIL)) {
            Log::warning('Care Alliance invitation has no valid recipient email', [
                'invitation_id' => $invitation->id,
                'organization_id' => $invitation->organization_id,
            ]);

            return;
        }

        $allianceName = $invitation->careAlliance?->name ?? 'Care Alliance';
        $orgName = $invitation->organization?->name ?? 'your organization';
        $inviterName = $invitation->invitedBy?->name ?? 'A Care Alliance admin';

        try {
            Mail::to($to)->send(new CareAllianceInvitationMail(
                $allianceName,
                $orgName,
                $inviterName,
                url('/organization/alliance-membership'),
            ));

            Log::info('Care Alliance invitation email sent', [
                'invitation_id' => $invitation->id,
                'email' => $to,
            ]);
        } catch (\Throwable $e) {
            Log::error('Failed to send Care Alliance invitation email', [
                'invitation_id' => $invitation->id,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    private function resolveRecipientEmail(CareAllianceInvitation $invitation): ?string
    {
        if (! empty($invitation->email) && filter_var($invitation->email, FILTER_VALIDATE_EMAIL)) {
            return $invitation->email;
        }

        $org = $invitation->organization;
        if ($org) {
            if (! empty($org->email) && filter_var($org->email, FILTER_VALIDATE_EMAIL)) {
                return $org->email;
            }
            $user = $org->user;
            if ($user && ! empty($user->email) && filter_var($user->email, FILTER_VALIDATE_EMAIL)) {
                return $user->email;
            }
        }

        return null;
    }
}
