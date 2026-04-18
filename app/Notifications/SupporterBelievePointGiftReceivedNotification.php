<?php

namespace App\Notifications;

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
        public float $amount,
        public ?string $giftMessage,
        public string $occasion = 'birthday',
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        $first = explode(' ', trim($this->sender->name ?? 'Someone'))[0];
        $amt = number_format($this->amount, 2);
        $body = "{$first} sent you {$amt} Believe Points as a gift.";

        return [
            'type' => 'believe_points_gift_received',
            'title' => 'You received Believe Points',
            'body' => $body,
            'meta' => [
                'amount' => $this->amount,
                'sender_id' => $this->sender->id,
                'sender_name' => $this->sender->name,
                'sender_slug' => $this->sender->slug,
                'occasion' => $this->occasion,
                'gift_message' => $this->giftMessage ? Str::limit($this->giftMessage, 200) : null,
            ],
        ];
    }
}
