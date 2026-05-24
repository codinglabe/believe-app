<?php

namespace Tests\Unit\Support;

use App\Support\MeetingRecordingPreference;
use PHPUnit\Framework\TestCase;

class MeetingRecordingPreferenceTest extends TestCase
{
    public function test_host_push_record_query_empty_when_recording_disabled(): void
    {
        $this->assertSame('', MeetingRecordingPreference::hostPushRecordQuery(['record_meeting' => false], false));
        $this->assertSame('', MeetingRecordingPreference::hostPushRecordQuery(['record_meeting' => false], true));
    }

    public function test_host_push_record_query_autorecord_when_recording_enabled(): void
    {
        $this->assertSame('&autorecord=6000', MeetingRecordingPreference::hostPushRecordQuery(['record_meeting' => true], false));
        $this->assertSame('&autorecord=4500', MeetingRecordingPreference::hostPushRecordQuery(['record_meeting' => true], true, 4500));
    }

    public function test_host_push_record_query_clamps_bitrate(): void
    {
        $this->assertSame('&autorecord=500', MeetingRecordingPreference::hostPushRecordQuery(['record_meeting' => true], false, 100));
        $this->assertSame('&autorecord=12000', MeetingRecordingPreference::hostPushRecordQuery(['record_meeting' => true], false, 99999));
    }

    public function test_is_enabled_defaults_by_livestream_type(): void
    {
        $this->assertFalse(MeetingRecordingPreference::isEnabled(null, false));
        $this->assertTrue(MeetingRecordingPreference::isEnabled(null, true));
        $this->assertFalse(MeetingRecordingPreference::isEnabled([], false));
        $this->assertTrue(MeetingRecordingPreference::isEnabled([], true));
    }
}
