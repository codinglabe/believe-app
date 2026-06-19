<?php

namespace App\Notifications;

use App\Models\Donation;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

class ManualDonationPendingForDonorNotification extends Notification
{
    public function __construct(
        public Donation $donation,
        public string $recipientLabel,
        public string $donateUrl,
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
        $amount = '$'.number_format((float) $this->donation->amount, 2);
        $body = "Your {$amount} manual payment to {$this->recipientLabel} is pending verification.";

        return [
            'type' => 'manual_donation_pending',
            'title' => 'Payment under review',
            'body' => $body,
            'message' => $body,
            'url' => $this->donateUrl,
            'click_action' => $this->donateUrl,
            'meta' => [
                'donation_id' => $this->donation->id,
                'organization_id' => $this->donation->organization_id,
                'amount' => (float) $this->donation->amount,
                'payment_method' => $this->donation->payment_method,
                'recipient_label' => $this->recipientLabel,
            ],
        ];
    }
}
