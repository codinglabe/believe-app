<?php

namespace App\Notifications;

use App\Models\CareAllianceInvitation;
use Illuminate\Notifications\Notification;

class CareAllianceInvitationNotification extends Notification
{
    public function __construct(
        public int $invitationId
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $invitation = CareAllianceInvitation::query()
            ->with(['careAlliance:id,name,slug', 'organization:id,name', 'invitedBy:id,name,email'])
            ->find($this->invitationId);

        if (! $invitation) {
            return [
                'type' => 'care_alliance_invitation',
                'title' => 'Care Alliance invitation',
                'body' => 'This invitation is no longer available. It may have been withdrawn or expired.',
                'message' => 'This invitation is no longer available.',
                'meta' => [
                    'show_care_alliance_actions' => false,
                ],
            ];
        }

        $allianceName = $invitation->careAlliance?->name ?? 'a Care Alliance';
        $orgName = $invitation->organization?->name ?? 'your organization';
        $inviter = $invitation->invitedBy;
        $inviterLabel = $inviter
            ? (trim((string) $inviter->name) !== '' ? $inviter->name : ($inviter->email ?? 'A Care Alliance organizer'))
            : 'A Care Alliance organizer';

        $expires = $invitation->expires_at;
        $expiresLine = $expires
            ? ' This invitation expires on '.$expires->timezone(config('app.timezone'))->format('M j, Y \a\t g:i A').'.'
            : '';

        $title = 'Care Alliance invitation';
        $body = $inviterLabel.' invited '.$orgName.' to join the '.$allianceName.' Care Alliance as a member organization. '
            .'Accept to appear in the alliance network and participate in shared programs, or decline if you are not interested.'
            .$expiresLine;

        $shortMessage = 'You were invited to join '.$allianceName.' on behalf of '.$orgName.'.';

        $pending = $invitation->status === 'pending'
            && (! $expires || ! $expires->isPast());

        return [
            'type' => 'care_alliance_invitation',
            'title' => $title,
            'body' => $body,
            'message' => $shortMessage,
            'invitation_id' => $invitation->id,
            'care_alliance_id' => $invitation->care_alliance_id,
            'alliance_name' => $allianceName,
            'organization_name' => $orgName,
            'inviter_label' => $inviterLabel,
            'meta' => [
                'invitation_id' => $invitation->id,
                'care_alliance_id' => $invitation->care_alliance_id,
                'alliance_name' => $allianceName,
                'organization_name' => $orgName,
                'show_care_alliance_actions' => $pending,
            ],
        ];
    }
}
