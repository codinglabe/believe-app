<?php

namespace App\Notifications;

use App\Models\SupporterBelievePointGift;
use App\Models\User;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

/**
 * Sent when another user sends Believe Points as a supporter gift (e.g. birthday).
 * Not queued so the inbox updates without a queue worker.
 */
class SupporterBelievePointGiftReceivedNotification extends Notification
{
    public function __construct(
        public User $sender,
        public SupporterBelievePointGift $gift,
        public float $amount,
        public ?string $giftMessage,
        public string $occasion = 'Gift',
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        $amt = rtrim(rtrim(number_format($this->amount, 2), '0'), '.');
        $body = "{$this->sender->name} sent you a gift for {$amt} BP.";
        if ($this->giftMessage) {
            $body .= "\nMessage: ".Str::limit($this->giftMessage, 200);
        }

        return [
            'type' => 'gift_received',
            'title' => 'You received a gift',
            'body' => $body,
            'meta' => [
                'gift_id' => $this->gift->id,
                'amount' => $this->amount,
                'sender_id' => $this->sender->id,
                'sender_name' => $this->sender->name,
                'sender_slug' => $this->sender->slug,
                'occasion' => $this->occasion,
                'message' => $this->giftMessage ? Str::limit($this->giftMessage, 200) : null,
            ],
        ];
    }
}
