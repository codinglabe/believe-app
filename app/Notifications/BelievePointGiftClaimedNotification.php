<?php

namespace App\Notifications;

use App\Models\BelievePointGiftInvite;
use App\Services\BelievePointGiftInviteService;
use Illuminate\Notifications\Notification;

class BelievePointGiftClaimedNotification extends Notification
{
    public function __construct(public BelievePointGiftInvite $invite) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        $amt = BelievePointGiftInviteService::formatAmount((float) $this->invite->amount);
        $name = $this->invite->recipient?->name ?? $this->invite->recipient_email;

        return [
            'type' => 'gift_invite_claimed',
            'title' => 'Gift claimed',
            'body' => "{$name} registered and received your {$amt} BP gift.",
            'meta' => [
                'invite_id' => $this->invite->id,
                'amount' => (float) $this->invite->amount,
                'recipient_id' => $this->invite->recipient_id,
                'recipient_email' => $this->invite->recipient_email,
            ],
        ];
    }
}
