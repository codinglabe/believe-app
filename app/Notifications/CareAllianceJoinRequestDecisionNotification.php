<?php

namespace App\Notifications;

use App\Models\CareAllianceJoinRequest;
use Illuminate\Notifications\Notification;

class CareAllianceJoinRequestDecisionNotification extends Notification
{
    public function __construct(
        public int $joinRequestId,
        public string $decision
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $row = CareAllianceJoinRequest::query()
            ->with(['careAlliance:id,name,slug'])
            ->find($this->joinRequestId);

        $approved = $this->decision === 'approved';
        $allianceName = $row?->careAlliance?->name ?? 'the Care Alliance';

        $title = $approved ? 'Request approved' : 'Request declined';
        $body = $approved
            ? 'Your organization\'s request to join '.$allianceName.' was approved. You are now an active member.'
            : 'Your organization\'s request to join '.$allianceName.' was declined. You may submit a new request later if circumstances change.';

        return [
            'type' => 'care_alliance_join_request_decision',
            'title' => $title,
            'body' => $body,
            'message' => $body,
            'join_request_id' => $row?->id,
            'meta' => [
                'join_request_id' => $row?->id,
                'decision' => $this->decision,
                'show_care_alliance_join_request' => false,
            ],
        ];
    }
}
