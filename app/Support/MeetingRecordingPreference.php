<?php

namespace App\Support;

final class MeetingRecordingPreference
{
    /**
     * Whether the meeting is configured to record (guests must consent before joining).
     * Organization livestreams default to on when the setting is absent; supporter (user) livestreams default to off.
     */
    public static function isEnabled(?array $settings, bool $organizationLivestream): bool
    {
        if ($settings === null) {
            return $organizationLivestream;
        }
        if (array_key_exists('record_meeting', $settings)) {
            return (bool) $settings['record_meeting'];
        }

        return $organizationLivestream;
    }

    /**
     * VDO.Ninja host-push query segment: auto-start disk recording when the meeting is configured to record.
     * Use only on {@see UserLivestream::getHostPushUrl()} / {@see OrganizationLivestream::getHostPushUrl()} —
     * not on director URLs (avoids extra recordings when guests join).
     */
    public static function hostPushRecordQuery(?array $settings, bool $organizationLivestream, int $bitrateKbps = 6000): string
    {
        if (! self::isEnabled($settings, $organizationLivestream)) {
            return '';
        }

        $bitrateKbps = max(500, min(12000, $bitrateKbps));

        return '&autorecord='.$bitrateKbps;
    }
}
