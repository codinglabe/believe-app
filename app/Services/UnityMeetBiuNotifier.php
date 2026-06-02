<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserLivestream;
use App\Notifications\UnityMeetInvitationNotification;
use App\Support\LivestreamParticipantEmails;
use Illuminate\Support\Facades\Log;

class UnityMeetBiuNotifier
{
    public function __construct(
        private readonly FirebaseService $firebaseService,
    ) {}

    /**
     * Send in-app + push BIU notification to a registered user by invite email.
     *
     * @return array{sent: bool, reason: ?string, push_devices: int}
     */
    public function notifyByEmail(UserLivestream $livestream, string $recipientEmail): array
    {
        $email = strtolower(trim($recipientEmail));
        if ($email === '' || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            return ['sent' => false, 'reason' => 'invalid_email', 'push_devices' => 0];
        }

        $livestream->loadMissing('user:id,name');
        $settings = is_array($livestream->settings) ? $livestream->settings : [];
        $participantEmails = LivestreamParticipantEmails::fromSettings($settings);

        if (! in_array($email, $participantEmails, true)) {
            return ['sent' => false, 'reason' => 'not_invited', 'push_devices' => 0];
        }

        $recipient = User::query()->whereRaw('LOWER(email) = ?', [$email])->first();
        if (! $recipient) {
            return ['sent' => false, 'reason' => 'no_biu_account', 'push_devices' => 0];
        }

        $hostName = trim((string) ($settings['display_name'] ?? $livestream->user?->name ?? 'Your host'));
        $meetingLabel = trim((string) ($livestream->title ?? '')) ?: 'Unity Meet';
        $joinUrl = \App\Support\UnityMeetUrls::guestJoinUrl($livestream->room_name);

        $title = 'Unity Meet invitation';
        $body = "{$hostName} invited you to {$meetingLabel}.";
        if ($livestream->scheduled_at) {
            $body .= ' Scheduled for '.$livestream->scheduled_at
                ->timezone(config('app.timezone'))
                ->format('l, F j, Y \a\t g:i A T').'.';
        }

        $recipient->notify(new UnityMeetInvitationNotification($livestream, $hostName, $joinUrl));

        $pushData = $this->firebaseService->stringifyFcmData([
            'type' => 'unity_meet_invitation',
            'title' => $title,
            'body' => $body,
            'url' => $joinUrl,
            'join_url' => $joinUrl,
            'click_action' => $joinUrl,
            'livestream_id' => (string) $livestream->id,
            'room_name' => (string) $livestream->room_name,
            'host_name' => $hostName,
            'meeting_title' => $meetingLabel,
            'scheduled_at' => $livestream->scheduled_at?->toIso8601String() ?? '',
            'source_type' => 'unity_meet',
            'source_id' => (string) $livestream->id,
        ]);

        $pushResults = $this->firebaseService->sendToUser($recipient->id, $title, $body, $pushData);
        $pushSuccess = is_array($pushResults)
            ? count(array_filter($pushResults, fn ($r) => ($r['success'] ?? false)))
            : 0;

        if ($pushSuccess === 0) {
            Log::info('Unity Meet BIU notification: inbox saved, push not delivered (no active device tokens)', [
                'livestream_id' => $livestream->id,
                'recipient_user_id' => $recipient->id,
                'email' => $email,
            ]);

            return ['sent' => true, 'reason' => 'no_push_token', 'push_devices' => 0];
        }

        Log::info('Unity Meet BIU notification sent', [
            'livestream_id' => $livestream->id,
            'recipient_user_id' => $recipient->id,
            'email' => $email,
            'push_devices' => $pushSuccess,
        ]);

        return ['sent' => true, 'reason' => null, 'push_devices' => $pushSuccess];
    }
}
