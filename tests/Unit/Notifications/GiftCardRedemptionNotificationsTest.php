<?php

namespace Tests\Unit\Notifications;

use App\Models\GiftCard;
use App\Notifications\GiftCardRedemptionReadyNotification;
use App\Notifications\GiftCardRedemptionSubmittedNotification;
use Tests\TestCase;

class GiftCardRedemptionNotificationsTest extends TestCase
{
    public function test_submitted_notification_payload_includes_url_and_72_hour_notice(): void
    {
        $giftCard = new GiftCard([
            'id' => 42,
            'brand_name' => 'Amazon',
            'amount' => 25,
            'currency' => 'USD',
            'status' => 'pending_fulfillment',
        ]);
        $giftCard->id = 42;

        $notification = new GiftCardRedemptionSubmittedNotification(
            $giftCard,
            'https://example.test/gift-cards/42',
            72,
        );

        $payload = $notification->toDatabase((object) []);

        $this->assertSame('gift_card_submitted', $payload['type']);
        $this->assertSame(['database', 'broadcast'], $notification->via((object) []));
        $this->assertStringContainsString('72 hours', $payload['body']);
        $this->assertSame('https://example.test/gift-cards/42', $payload['url']);
        $this->assertSame(42, $payload['meta']['gift_card_id']);
    }

    public function test_ready_notification_payload_includes_click_target(): void
    {
        $giftCard = new GiftCard([
            'id' => 99,
            'brand_name' => 'Target',
            'amount' => 50,
            'currency' => 'USD',
            'status' => 'completed',
        ]);
        $giftCard->id = 99;

        $notification = new GiftCardRedemptionReadyNotification(
            $giftCard,
            'https://example.test/gift-cards/99',
        );

        $payload = $notification->toDatabase((object) []);

        $this->assertSame('gift_card_ready', $payload['type']);
        $this->assertSame(['database', 'broadcast'], $notification->via((object) []));
        $this->assertStringContainsString('ready to use', $payload['body']);
        $this->assertSame('https://example.test/gift-cards/99', $payload['click_action']);
    }
}
