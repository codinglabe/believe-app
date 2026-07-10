<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CampaignPrayerMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $recipientName,
        public string $organizationName,
        public string $title,
        public string $bodyText,
        public ?string $scriptureRef,
        public string $contentUrl,
    ) {}

    public function envelope(): Envelope
    {
        $org = $this->organizationName !== '' ? $this->organizationName : config('app.name');

        return new Envelope(
            subject: "{$this->title} — {$org}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.campaign-prayer',
        );
    }
}
