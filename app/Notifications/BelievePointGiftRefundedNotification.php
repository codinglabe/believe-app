<?php

namespace App\Notifications;

use App\Models\BelievePointGiftInvite;
use App\Services\BelievePointGiftInviteService;
use Illuminate\Notifications\Notification;

class BelievePointGiftRefundedNotification extends Notification
{
    public function __construct(public BelievePointGiftInvite $invite) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        $amt = BelievePointGiftInviteService::formatAmount((float) $this->invite->amount);

        return [
            'type' => 'gift_invite_expired',
            'title' => 'Gift invite expired',
            'body' => "{$amt} BP was returned to your Available balance. {$this->invite->recipient_email} did not register in time.",
            'meta' => [
                'invite_id' => $this->invite->id,
                'amount' => (float) $this->invite->amount,
                'recipient_email' => $this->invite->recipient_email,
            ],
        ];
    }
}
