<?php

namespace Tests\Unit\Support;

use App\Enums\PushNotificationModule;
use App\Models\PushNotificationLog;
use App\Support\PushNotificationLogMetadata;
use Tests\TestCase;

class PushNotificationLogMetadataTest extends TestCase
{
    public function test_new_message_is_detected_as_chat(): void
    {
        $log = new PushNotificationLog([
            'module_name' => 'system',
            'notification_title' => 'New Message',
            'notification_body' => 'New message from Ashraf',
        ]);

        $this->assertSame(PushNotificationModule::Chat->value, PushNotificationLogMetadata::resolveModuleName($log));
    }

    public function test_sender_name_is_parsed_from_chat_body(): void
    {
        $name = PushNotificationLogMetadata::parseSenderNameFromBody('New message from Ashraf');

        $this->assertSame('Ashraf', $name);
    }

    public function test_group_chat_sender_is_parsed_from_body_prefix(): void
    {
        $name = PushNotificationLogMetadata::parseSenderNameFromBody(
            'Ashraf: Hello everyone',
            'Team Room',
        );

        $this->assertSame('Ashraf', $name);
    }
}
