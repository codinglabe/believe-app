<?php

namespace App\Notifications;

use App\Models\Product;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class BidCancelledNotification extends Notification implements ShouldQueue
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
            ->subject('Update on your bid for ' . $this->product->name)
            ->greeting('Hello ' . ($notifiable->name ?? 'there') . ',')
            ->line('A bid on the product "' . $this->product->name . '" was cancelled by the seller.')
            ->line('This does not affect your ability to place a new bid while the bidding window is open, but final results may change.')
            ->action('View product', url(route('products.show.public', $this->product->id)))
            ->line('Thank you for supporting causes on Believe In Unity.');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'bid_cancelled',
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'message' => 'A bid was cancelled on "' . $this->product->name . '".',
        ];
    }
}

