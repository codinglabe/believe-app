<?php

namespace App\Mail;

use App\Models\BelievePointGiftInvite;
use App\Services\BelievePointGiftInviteService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BelievePointGiftInvitePendingMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public BelievePointGiftInvite $invite) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your Believe Points gift is holding until they register',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.believe-point-gift-invite-pending',
            with: [
                'invite' => $this->invite,
                'amountLabel' => BelievePointGiftInviteService::formatAmount((float) $this->invite->amount),
                'holdDays' => BelievePointGiftInviteService::holdDays(),
                'expiresAt' => $this->invite->expires_at?->timezone(config('app.timezone'))->format('F j, Y'),
                'manageUrl' => route('gift-bp.index', [], true),
            ],
        );
    }
}
