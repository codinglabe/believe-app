<?php

namespace App\Support;

use App\Models\OrganizationLivestream;
use App\Models\UserLivestream;

/**
 * Canonical Unity Meet URLs (meetings), distinct from Unity Live broadcast paths.
 */
class UnityMeetUrls
{
    public const HOST_KIND_ORGANIZATION = 'organization';

    public const HOST_KIND_USER = 'user';

    public static function guestJoinUrl(string $roomName): string
    {
        return route('unity-meet.join', ['roomName' => $roomName]);
    }

    /** Host dashboard for a personal (supporter) meeting — scheduled, live, or ended. */
    public static function supporterHostUrl(int $userLivestreamId): string
    {
        return route('livestreams.supporter.show', $userLivestreamId);
    }

    /** Join page where guests enter meeting ID (optional prefill via query). */
    public static function supporterJoinPageUrl(?string $roomName = null): string
    {
        $url = route('livestreams.supporter.join');

        if ($roomName !== null && $roomName !== '') {
            return $url.'?'.http_build_query(['meeting_id' => $roomName]);
        }

        return $url;
    }

    /**
     * Connection Hub listings use supporter URLs (not /livestreams org dashboard or /unity-meet/*).
     *
     * @return array{join_link: string, host_link: string}
     */
    public static function linksForConnectionHub(UserLivestream $livestream): array
    {
        return [
            'join_link' => self::supporterJoinPageUrl($livestream->room_name),
            'host_link' => self::supporterHostUrl((int) $livestream->id),
        ];
    }

    public static function hostReadyUrl(string $kind, int $livestreamId): string
    {
        return match ($kind) {
            self::HOST_KIND_ORGANIZATION => route('unity-meet.host.organization', ['id' => $livestreamId]),
            self::HOST_KIND_USER => route('unity-meet.host.user', ['id' => $livestreamId]),
            default => route('unity-meet.host.user', ['id' => $livestreamId]),
        };
    }

    public static function hostDashboardUrl(string $kind, int $livestreamId): string
    {
        return match ($kind) {
            self::HOST_KIND_ORGANIZATION => route('organization.livestreams.show', $livestreamId),
            self::HOST_KIND_USER => route('livestreams.supporter.show', $livestreamId),
            default => route('livestreams.supporter.show', $livestreamId),
        };
    }

    /**
     * Host entry point for scheduled / draft meetings (Unity Meet Ready).
     */
    public static function hostUrlForScheduledMeeting(OrganizationLivestream|UserLivestream $livestream, string $kind): string
    {
        if (in_array($livestream->status, ['draft', 'scheduled'], true)) {
            return self::hostReadyUrl($kind, (int) $livestream->id);
        }

        return self::hostDashboardUrl($kind, (int) $livestream->id);
    }

    /**
     * @return array{join_link: string, host_link: string}
     */
    public static function linksForLivestream(OrganizationLivestream|UserLivestream $livestream, string $kind): array
    {
        if ($livestream instanceof UserLivestream && self::isConnectionHubLivestream($livestream)) {
            return self::linksForConnectionHub($livestream);
        }

        return [
            'join_link' => self::guestJoinUrl($livestream->room_name),
            'host_link' => self::hostUrlForScheduledMeeting($livestream, $kind),
        ];
    }

    private static function isConnectionHubLivestream(UserLivestream $livestream): bool
    {
        $settings = is_array($livestream->settings) ? $livestream->settings : [];

        return ($settings['source'] ?? null) === 'connection_hub'
            || ($settings['unity_meet'] ?? false) === true;
    }
}
