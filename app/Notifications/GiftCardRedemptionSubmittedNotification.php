<?php

namespace App\Notifications;

use App\Models\GiftCard;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

class GiftCardRedemptionSubmittedNotification extends Notification
{
    public function __construct(
        public GiftCard $giftCard,
        public string $giftCardUrl,
        public int $delayHours = 72,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database', 'broadcast'];
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->toDatabase($notifiable));
    }

    public function toDatabase(object $notifiable): array
    {
        $brand = $this->giftCard->brand_name ?? 'Gift card';
        $amount = number_format((float) $this->giftCard->amount, 2);
        $body = "Your {$brand} gift card for \${$amount} is being prepared and will be available within {$this->delayHours} hours.";

        return [
            'type' => 'gift_card_submitted',
            'title' => 'Gift card purchase received',
            'body' => $body,
            'message' => $body,
            'url' => $this->giftCardUrl,
            'click_action' => $this->giftCardUrl,
            'meta' => [
                'gift_card_id' => $this->giftCard->id,
                'brand_name' => $this->giftCard->brand_name,
                'amount' => (float) $this->giftCard->amount,
                'currency' => $this->giftCard->currency,
                'status' => $this->giftCard->status,
                'scheduled_fulfillment_at' => $this->giftCard->scheduled_fulfillment_at?->toIso8601String(),
                'delay_hours' => $this->delayHours,
                'gift_card_url' => $this->giftCardUrl,
            ],
        ];
    }
}
