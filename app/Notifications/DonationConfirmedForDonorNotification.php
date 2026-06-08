<?php

namespace App\Notifications;

use App\Models\Donation;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

/**
 * In-app confirmation when a supporter's donation completes.
 */
class DonationConfirmedForDonorNotification extends Notification
{
    public function __construct(
        public Donation $donation,
        public string $recipientLabel,
        public string $successUrl,
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
        $isRecurring = $this->donation->frequency && $this->donation->frequency !== 'one-time';
        $body = "Your {$amount} gift to {$this->recipientLabel} was received.";
        if ($isRecurring) {
            $body .= ' This is a recurring donation.';
        }
        if ($this->donation->message) {
            $body .= "\nMessage: ".Str::limit((string) $this->donation->message, 200);
        }

        return [
            'type' => 'donation_confirmed',
            'title' => 'Donation confirmed',
            'body' => $body,
            'message' => $body,
            'url' => $this->successUrl,
            'click_action' => $this->successUrl,
            'meta' => [
                'donation_id' => $this->donation->id,
                'organization_id' => $this->donation->organization_id,
                'care_alliance_id' => $this->donation->care_alliance_id,
                'amount' => (float) $this->donation->amount,
                'frequency' => $this->donation->frequency,
                'payment_method' => $this->donation->payment_method,
                'recipient_label' => $this->recipientLabel,
                'success_url' => $this->successUrl,
            ],
        ];
    }
}
