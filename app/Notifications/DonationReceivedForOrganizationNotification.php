<?php

namespace App\Notifications;

use App\Models\Donation;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

/**
 * In-app alert when a nonprofit receives a new donation.
 */
class DonationReceivedForOrganizationNotification extends Notification
{
    public function __construct(
        public Donation $donation,
        public string $donorName,
        public string $donationsUrl,
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
        $body = "{$this->donorName} donated {$amount}.";
        if ($isRecurring) {
            $body .= ' Recurring gift.';
        }
        if ($this->donation->message) {
            $body .= "\nMessage: ".Str::limit((string) $this->donation->message, 200);
        }

        return [
            'type' => 'donation_received',
            'title' => 'New donation received',
            'body' => $body,
            'message' => $body,
            'url' => $this->donationsUrl,
            'click_action' => $this->donationsUrl,
            'meta' => [
                'donation_id' => $this->donation->id,
                'organization_id' => $this->donation->organization_id,
                'care_alliance_id' => $this->donation->care_alliance_id,
                'donor_user_id' => $this->donation->user_id,
                'donor_name' => $this->donorName,
                'amount' => (float) $this->donation->amount,
                'frequency' => $this->donation->frequency,
                'payment_method' => $this->donation->payment_method,
                'donations_url' => $this->donationsUrl,
            ],
        ];
    }
}
