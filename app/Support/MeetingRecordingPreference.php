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
}
