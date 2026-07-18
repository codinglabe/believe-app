<?php

namespace App\Mail;

use App\Models\BelievePointGiftInvite;
use App\Services\BelievePointGiftInviteService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BelievePointGiftClaimedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public BelievePointGiftInvite $invite)
    {
        $this->invite->loadMissing(['sender', 'recipient']);
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your Believe Points gift was claimed',
        );
    }

    public function content(): Content
    {
        $name = $this->invite->recipient?->name ?? $this->invite->recipient_email;

        return new Content(
            view: 'emails.believe-point-gift-claimed',
            with: [
                'recipientName' => $name,
                'amountLabel' => BelievePointGiftInviteService::formatAmount((float) $this->invite->amount),
                'bpUrl' => route('believe-points.index', [], true),
            ],
        );
    }
}
