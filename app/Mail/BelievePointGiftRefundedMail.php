<?php

namespace App\Mail;

use App\Models\BelievePointGiftInvite;
use App\Services\BelievePointGiftInviteService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BelievePointGiftRefundedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public BelievePointGiftInvite $invite) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your Believe Points gift invite expired — BP returned',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.believe-point-gift-refunded',
            with: [
                'recipientEmail' => $this->invite->recipient_email,
                'amountLabel' => BelievePointGiftInviteService::formatAmount((float) $this->invite->amount),
                'bpUrl' => route('believe-points.index', [], true),
            ],
        );
    }
}
