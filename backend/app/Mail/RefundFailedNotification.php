<?php

namespace App\Mail;

use App\Models\ServiceOrder;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class RefundFailedNotification extends Mailable
{
    use Queueable, SerializesModels;

    public $order;
    public $errorMessage;

    public function __construct(ServiceOrder $order, string $errorMessage)
    {
        $this->order = $order;
        $this->errorMessage = $errorMessage;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '⚠️ Refund Failed for Order #' . $this->order->order_number,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.refund-failed',
            with: [
                'order' => $this->order,
                'errorMessage' => $this->errorMessage,
            ],
        );
    }
}
