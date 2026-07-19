<?php

namespace App\Mail;

use App\Models\BelievePointGiftInvite;
use App\Services\BelievePointGiftInviteService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Sent to the invitee email when a pending gift invite is cancelled
 * (or when the sender changes the invitation to a different email).
 */
class BelievePointGiftInviteCancelledMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $recipientEmail,
        public string $senderName,
        public float $brpAmount,
        public ?BelievePointGiftInvite $invite = null,
        public string $reason = 'cancelled',
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Gift Invitation Cancelled',
        );
    }

    public function content(): Content
    {
        $brpLabel = BelievePointGiftInviteService::formatAmount($this->brpAmount);

        return new Content(
            view: 'emails.believe-point-gift-invite-cancelled',
            with: [
                'recipientEmail' => $this->recipientEmail,
                'senderName' => $this->senderName,
                'brpLabel' => $brpLabel,
                'registerUrl' => route('register.user', [
                    'email' => $this->recipientEmail,
                ], true),
                'reason' => $this->reason,
                'amountLabel' => $this->invite
                    ? BelievePointGiftInviteService::formatAmount((float) $this->invite->amount)
                    : null,
            ],
        );
    }
}
