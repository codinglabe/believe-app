<?php

namespace App\Notifications;

use App\Models\User;
use App\Models\UserLivestream;
use App\Services\TimezoneService;
use Illuminate\Notifications\Notification;

/**
 * In-app notification (bell inbox). Push is sent separately via UnityMeetBiuNotifier.
 */
class UnityMeetInvitationNotification extends Notification
{
    public function __construct(
        public UserLivestream $livestream,
        public string $hostName,
        public string $joinUrl,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        $meetingLabel = trim((string) ($this->livestream->title ?? '')) ?: 'Unity Meet';

        $body = "{$this->hostName} invited you to {$meetingLabel}.";
        if ($this->livestream->scheduled_at) {
            $recipientTz = $notifiable instanceof User
                ? TimezoneService::forUser($notifiable)
                : config('app.timezone', 'UTC');
            $body .= ' Scheduled for '.TimezoneService::formatUtcForTimezone(
                $this->livestream->scheduled_at,
                $recipientTz,
                'l, F j, Y \a\t g:i A T',
            ).'.';
        }

        return [
            'type' => 'unity_meet_invitation',
            'title' => 'Unity Meet invitation',
            'body' => $body,
            'message' => $body,
            'url' => $this->joinUrl,
            'click_action' => $this->joinUrl,
            'livestream_id' => (string) $this->livestream->id,
            'room_name' => $this->livestream->room_name,
            'host_name' => $this->hostName,
            'meeting_title' => $meetingLabel,
            'scheduled_at' => $this->livestream->scheduled_at?->toIso8601String(),
            'meta' => [
                'livestream_id' => $this->livestream->id,
                'room_name' => $this->livestream->room_name,
                'join_url' => $this->joinUrl,
            ],
        ];
    }
}
