<?php

namespace App\Mail;

use App\Models\Donation;
use App\Models\User;
use App\Services\TimezoneService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class DonationConfirmationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Donation $donation,
        public User $donor,
        public string $recipientLabel,
        public string $successUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Thank you for your donation — '.config('app.name'),
        );
    }

    public function content(): Content
    {
        $donationAt = $this->donation->donation_date ?? $this->donation->created_at;
        $donationDateFormatted = TimezoneService::formatUtcForTimezone(
            $donationAt,
            TimezoneService::forUser($this->donor),
            'F j, Y g:i A T',
        );

        return new Content(
            view: 'emails.donation-confirmation',
            with: [
                'donation' => $this->donation,
                'donor' => $this->donor,
                'recipientLabel' => $this->recipientLabel,
                'successUrl' => $this->successUrl,
                'donationDateFormatted' => $donationDateFormatted,
            ],
        );
    }
}
