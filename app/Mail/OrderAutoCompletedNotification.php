<?php

namespace App\Mail;

use App\Models\ServiceOrder;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class OrderAutoCompletedNotification extends Mailable
{
    use Queueable, SerializesModels;

    public $order;
    public $isBuyer;

    public function __construct(ServiceOrder $order, $isBuyer = true)
    {
        $this->order = $order;
        $this->isBuyer = $isBuyer;
    }

    public function build()
    {
        $subject = $this->isBuyer
            ? "Order #{$this->order->order_number} Automatically Completed"
            : "Order #{$this->order->order_number} Auto-Completed - Funds Released";

        return $this->subject($subject)
            ->markdown('emails.orders.auto-completed')
            ->with([
                'order' => $this->order,
                'isBuyer' => $this->isBuyer,
            ]);
    }
}
