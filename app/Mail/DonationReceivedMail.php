<?php

namespace App\Mail;

use App\Models\Donation;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class DonationReceivedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Donation $donation,
        public User $orgUser,
        public string $donorName,
        public string $donationsUrl,
    ) {}

    public function envelope(): Envelope
    {
        $amount = '$'.number_format((float) $this->donation->amount, 2);

        return new Envelope(
            subject: "New {$amount} donation received — ".config('app.name'),
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.donation-received',
            with: [
                'donation' => $this->donation,
                'orgUser' => $this->orgUser,
                'donorName' => $this->donorName,
                'donationsUrl' => $this->donationsUrl,
            ],
        );
    }
}
