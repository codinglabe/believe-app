<?php

namespace App\Notifications;

use App\Models\GiftCard;
use Illuminate\Notifications\Notification;

class GiftCardRedemptionDelayedNotification extends Notification
{
    public function __construct(
        public GiftCard $giftCard,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        $brand = $this->giftCard->brand_name ?? 'Gift card';
        $amount = number_format((float) $this->giftCard->amount, 2);

        return [
            'type' => 'gift_card_delayed',
            'title' => 'Gift card issuance delayed',
            'body' => "Your {$brand} gift card for \${$amount} is pending. Issuance is delayed due to gift card reserve availability. We will retry automatically and notify you when it is ready.",
            'meta' => [
                'gift_card_id' => $this->giftCard->id,
                'brand_name' => $this->giftCard->brand_name,
                'amount' => (float) $this->giftCard->amount,
                'currency' => $this->giftCard->currency,
                'scheduled_fulfillment_at' => $this->giftCard->scheduled_fulfillment_at?->toIso8601String(),
            ],
        ];
    }
}
