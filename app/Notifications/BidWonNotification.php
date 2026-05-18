<?php

namespace App\Notifications;

use App\Models\Product;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class BidWonNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        protected Product $product,
        protected float $amount,
        protected ?string $payByDate
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $url = route('profile.bid-wins');
        $msg = (new MailMessage)
            ->subject('You won: ' . $this->product->name)
            ->greeting('Hello ' . ($notifiable->name ?? 'there') . ',')
            ->line('Congratulations! You won the bid for **' . $this->product->name . '** at $' . number_format($this->amount, 2) . '.')
            ->line('Please complete your payment to receive the product.');
        if ($this->payByDate) {
            $msg->line('Payment deadline: ' . $this->payByDate);
        }
        $msg->action('Pay now', url($url))
            ->line('Thank you for supporting Believe In Unity.');
        return $msg;
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'bid_won',
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'amount' => $this->amount,
            'message' => 'You won "' . $this->product->name . '" at $' . number_format($this->amount, 2) . '. Pay now to complete your purchase.',
        ];
    }
}
