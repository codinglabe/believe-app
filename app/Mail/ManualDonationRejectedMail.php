<?php

namespace App\Mail;

use App\Models\Donation;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ManualDonationRejectedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Donation $donation,
        public User $donor,
        public string $recipientLabel,
        public ?string $reviewNotes,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Donation could not be verified — '.config('app.name'),
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.manual-donation-rejected',
            with: [
                'donation' => $this->donation,
                'donor' => $this->donor,
                'recipientLabel' => $this->recipientLabel,
                'reviewNotes' => $this->reviewNotes,
            ],
        );
    }
}
