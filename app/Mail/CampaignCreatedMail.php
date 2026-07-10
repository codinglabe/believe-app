<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CampaignCreatedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $recipientName,
        public string $organizationName,
        public string $campaignName,
        public string $startDateFormatted,
        public string $endDateFormatted,
        public string $sendTimeLocal,
        public string $campaignUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "{$this->organizationName} created a new campaign: {$this->campaignName}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.campaign-created',
        );
    }
}
