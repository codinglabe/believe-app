<?php

namespace App\Mail;

use App\Models\BelievePointGiftInvite;
use App\Services\BelievePointGiftInviteService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BelievePointGiftInviteCancelledSenderMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public BelievePointGiftInvite $invite) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Gift invitation cancelled — BP returned to Available',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.believe-point-gift-invite-cancelled-sender',
            with: [
                'recipientEmail' => $this->invite->recipient_email,
                'amountLabel' => BelievePointGiftInviteService::formatAmount((float) $this->invite->amount),
                'manageUrl' => route('gift-bp.index', [], true),
            ],
        );
    }
}
