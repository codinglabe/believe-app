<?php

namespace App\Notifications;

use App\Models\SupporterBelievePointGift;
use App\Models\User;
use App\Services\BelievePointGiftInviteService;
use Illuminate\Notifications\Notification;

class BelievePointGiftSentNotification extends Notification
{
    public function __construct(
        public SupporterBelievePointGift $gift,
        public User $recipient,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        $amt = BelievePointGiftInviteService::formatAmount((float) $this->gift->amount);

        return [
            'type' => 'gift_sent',
            'title' => 'Gift sent',
            'body' => "You sent {$amt} BP to {$this->recipient->name}.",
            'meta' => [
                'gift_id' => $this->gift->id,
                'amount' => (float) $this->gift->amount,
                'recipient_id' => $this->recipient->id,
                'recipient_name' => $this->recipient->name,
                'occasion' => $this->gift->occasion,
            ],
        ];
    }
}
