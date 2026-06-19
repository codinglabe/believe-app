<?php

namespace App\Notifications;

use App\Models\Donation;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

class ManualDonationRejectedForDonorNotification extends Notification
{
    public function __construct(
        public Donation $donation,
        public string $recipientLabel,
        public string $donateUrl,
        public ?string $reviewNotes,
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
        $body = "Your {$amount} manual payment to {$this->recipientLabel} could not be verified.";
        if ($this->reviewNotes) {
            $body .= "\nNote: {$this->reviewNotes}";
        }

        return [
            'type' => 'manual_donation_rejected',
            'title' => 'Donation not verified',
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
                'review_notes' => $this->reviewNotes,
            ],
        ];
    }
}
