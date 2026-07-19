<?php

namespace App\Notifications;

use App\Models\BelievePointGiftInvite;
use App\Services\BelievePointGiftInviteService;
use Illuminate\Notifications\Notification;

class BelievePointGiftInviteEmailChangedNotification extends Notification
{
    public function __construct(
        public BelievePointGiftInvite $invite,
        public string $previousEmail,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        $amt = BelievePointGiftInviteService::formatAmount((float) $this->invite->amount);

        return [
            'type' => 'gift_invite_email_changed',
            'title' => 'Gift invitation email updated',
            'body' => "Your {$amt} BP invite was moved from {$this->previousEmail} to {$this->invite->recipient_email}.",
            'meta' => [
                'invite_id' => $this->invite->id,
                'amount' => (float) $this->invite->amount,
                'previous_email' => $this->previousEmail,
                'recipient_email' => $this->invite->recipient_email,
            ],
        ];
    }
}
