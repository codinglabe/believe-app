<?php

namespace App\Notifications;

use App\Models\BelievePointGiftInvite;
use App\Services\BelievePointGiftInviteService;
use Illuminate\Notifications\Notification;

class BelievePointGiftInvitePendingNotification extends Notification
{
    public function __construct(public BelievePointGiftInvite $invite) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        $amt = BelievePointGiftInviteService::formatAmount((float) $this->invite->amount);
        $days = BelievePointGiftInviteService::holdDays();

        return [
            'type' => 'gift_invite_pending',
            'title' => 'Gift invite sent',
            'body' => "{$amt} BP is holding for {$this->invite->recipient_email}. They have {$days} days to register.",
            'meta' => [
                'invite_id' => $this->invite->id,
                'amount' => (float) $this->invite->amount,
                'recipient_email' => $this->invite->recipient_email,
                'expires_at' => $this->invite->expires_at?->toIso8601String(),
            ],
        ];
    }
}
