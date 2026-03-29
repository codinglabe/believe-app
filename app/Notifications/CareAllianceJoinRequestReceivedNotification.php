<?php

namespace App\Notifications;

use App\Models\CareAllianceJoinRequest;
use Illuminate\Notifications\Notification;

class CareAllianceJoinRequestReceivedNotification extends Notification
{
    public function __construct(
        public int $joinRequestId
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $row = CareAllianceJoinRequest::query()
            ->with(['organization:id,name', 'careAlliance:id,name,slug'])
            ->find($this->joinRequestId);

        if (! $row) {
            return [
                'type' => 'care_alliance_join_request',
                'title' => 'Membership request',
                'body' => 'A membership request update is no longer available.',
                'message' => 'Request unavailable.',
                'meta' => ['show_care_alliance_join_request' => false],
            ];
        }

        $orgName = $row->organization?->name ?? 'An organization';
        $allianceName = $row->careAlliance?->name ?? 'your alliance';

        $title = 'New membership request';
        $body = $orgName.' has requested to join '.$allianceName.'. Review it in Members under membership requests.';

        return [
            'type' => 'care_alliance_join_request',
            'title' => $title,
            'body' => $body,
            'message' => $body,
            'join_request_id' => $row->id,
            'meta' => [
                'join_request_id' => $row->id,
                'care_alliance_id' => $row->care_alliance_id,
                'show_care_alliance_join_request' => $row->status === 'pending',
            ],
        ];
    }
}
