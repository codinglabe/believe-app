<?php

namespace App\Mail;

use App\Models\BelievePointGiftInvite;
use App\Services\BelievePointGiftInviteService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/** Confirmation to the sender after changing a pending invite email. */
class BelievePointGiftInviteEmailChangedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public BelievePointGiftInvite $invite,
        public string $previousEmail,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Gift invitation email updated',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.believe-point-gift-invite-email-changed',
            with: [
                'previousEmail' => $this->previousEmail,
                'newEmail' => $this->invite->recipient_email,
                'amountLabel' => BelievePointGiftInviteService::formatAmount((float) $this->invite->amount),
                'expiresAt' => $this->invite->expires_at?->timezone(config('app.timezone'))->format('F j, Y'),
                'manageUrl' => route('gift-bp.index', [], true),
            ],
        );
    }
}
