<?php

namespace App\Notifications;

use App\Models\BelievePointGiftInvite;
use App\Services\BelievePointGiftInviteService;
use Illuminate\Notifications\Notification;

class BelievePointGiftInviteCancelledNotification extends Notification
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
            'type' => 'gift_invite_cancelled',
            'title' => 'Gift invitation cancelled',
            'body' => "{$amt} BP was returned to your Available balance. Invitation to {$this->invite->recipient_email} was cancelled.",
            'meta' => [
                'invite_id' => $this->invite->id,
                'amount' => (float) $this->invite->amount,
                'recipient_email' => $this->invite->recipient_email,
            ],
        ];
    }
}
