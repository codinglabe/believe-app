<?php

namespace App\Notifications;

use App\Models\Product;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class BidLostNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(protected Product $product)
    {
    }

    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Bid result: ' . $this->product->name)
            ->greeting('Hello ' . ($notifiable->name ?? 'there') . ',')
            ->line('Bidding has ended for **' . $this->product->name . '**. Unfortunately your bid was not the winning bid this time.')
            ->line('You can browse more products on the marketplace.')
            ->action('Browse marketplace', url('/marketplace'))
            ->line('Thank you for supporting Believe In Unity.');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'bid_lost',
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'message' => 'You did not win the bid for "' . $this->product->name . '".',
        ];
    }
}
