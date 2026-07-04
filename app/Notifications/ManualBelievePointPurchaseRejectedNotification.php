<?php

namespace App\Notifications;

use App\Models\BelievePointPurchase;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

class ManualBelievePointPurchaseRejectedNotification extends Notification
{
    public function __construct(
        public BelievePointPurchase $purchase,
        public string $believePointsUrl,
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
        $amount = '$'.number_format((float) $this->purchase->amount, 2);
        $body = "Your {$amount} manual Believe Points payment could not be verified.";
        if ($this->reviewNotes) {
            $body .= "\nNote: {$this->reviewNotes}";
        }

        return [
            'type' => 'manual_believe_points_purchase_rejected',
            'title' => 'Believe Points purchase not verified',
            'body' => $body,
            'message' => $body,
            'url' => $this->believePointsUrl,
            'click_action' => $this->believePointsUrl,
            'meta' => [
                'believe_point_purchase_id' => $this->purchase->id,
                'amount' => (float) $this->purchase->amount,
                'points' => (float) $this->purchase->points,
                'payment_method' => $this->purchase->payment_method,
                'review_notes' => $this->reviewNotes,
            ],
        ];
    }
}
