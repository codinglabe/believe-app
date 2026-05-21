<?php

namespace App\Support;

use App\Events\UnityLiveViewerStatusChanged;
use App\Models\OrganizationLivestream;
use App\Models\UserLivestream;
use Illuminate\Support\Facades\Log;
use Throwable;

final class UnityLiveBroadcast
{
    public static function channelName(OrganizationLivestream|UserLivestream $livestream): string
    {
        $kind = $livestream instanceof UserLivestream ? 'user' : 'organization';

        return 'unity-live.'.$kind.'.'.$livestream->id;
    }

    /**
     * @return array<string, mixed>
     */
    public static function payloadFor(
        OrganizationLivestream|UserLivestream $livestream,
        string $reason,
        ?string $message = null,
    ): array {
        $livestream->refresh();
        $livestream->loadMissing($livestream instanceof UserLivestream ? 'user' : 'organization');

        $kind = $livestream instanceof UserLivestream ? 'user' : 'organization';
        $hostName = $kind === 'user'
            ? ($livestream->user?->name ?? 'Host')
            : ($livestream->organization?->name ?? 'Organization');

        return [
            'kind' => $kind,
            'livestreamId' => $livestream->id,
            'roomName' => $livestream->room_name,
            'status' => (string) $livestream->status,
            'isPublic' => (bool) $livestream->is_public,
            'reason' => $reason,
            'message' => $message ?? self::defaultMessage($reason),
            'hostName' => $hostName,
            'title' => $livestream->title ?: 'Live Stream',
        ];
    }

    public static function notify(
        OrganizationLivestream|UserLivestream $livestream,
        string $reason,
        ?string $message = null,
    ): void {
        try {
            event(new UnityLiveViewerStatusChanged(
                channelName: self::channelName($livestream),
                reason: $reason,
                payload: self::payloadFor($livestream, $reason, $message),
            ));
        } catch (Throwable $e) {
            // Do not fail go-live / end-stream if Reverb is unreachable (misconfigured nginx, etc.).
            Log::warning('Unity Live broadcast skipped', [
                'reason' => $reason,
                'livestream_id' => $livestream->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    public static function notifyMeetingStarted(OrganizationLivestream|UserLivestream $livestream): void
    {
        self::notify(
            $livestream,
            'meeting_started',
            'The meeting has started. The stream will appear here when the host goes live on Unity Live.',
        );
    }

    public static function notifyLive(OrganizationLivestream|UserLivestream $livestream): void
    {
        self::notify($livestream, 'live', 'Going live now — the player will start automatically.');
    }

    public static function notifyUnityLiveEnded(OrganizationLivestream|UserLivestream $livestream): void
    {
        self::notify($livestream, 'unity_live_ended', 'Unity Live has ended. The host may still be in the meeting.');
    }

    public static function notifyStreamEnded(OrganizationLivestream|UserLivestream $livestream): void
    {
        self::notify($livestream, 'stream_ended', 'This stream has ended. Thanks for watching.');
    }

    private static function defaultMessage(string $reason): string
    {
        return match ($reason) {
            'meeting_started' => 'The meeting has started. The stream will appear here when the host goes live on Unity Live.',
            'live' => 'Going live now — the player will start automatically.',
            'unity_live_ended' => 'Unity Live has ended. The host may still be in the meeting.',
            'stream_ended' => 'This stream has ended. Thanks for watching.',
            default => 'Stream status updated.',
        };
    }
}
