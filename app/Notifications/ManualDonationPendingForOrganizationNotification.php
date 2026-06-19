<?php

namespace App\Notifications;

use App\Models\Donation;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

class ManualDonationPendingForOrganizationNotification extends Notification
{
    public function __construct(
        public Donation $donation,
        public string $donorName,
        public string $reviewUrl,
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
        $body = "{$this->donorName} submitted a {$amount} manual payment for your review.";

        return [
            'type' => 'manual_donation_pending_review',
            'title' => 'Manual payment to review',
            'body' => $body,
            'message' => $body,
            'url' => $this->reviewUrl,
            'click_action' => $this->reviewUrl,
            'meta' => [
                'donation_id' => $this->donation->id,
                'organization_id' => $this->donation->organization_id,
                'donor_name' => $this->donorName,
                'amount' => (float) $this->donation->amount,
                'payment_method' => $this->donation->payment_method,
            ],
        ];
    }
}
