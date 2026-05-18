<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CareAllianceInvitationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $allianceName,
        public string $organizationName,
        public string $inviterName,
        public string $dashboardUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Invitation to join '.$this->allianceName.' on '.config('app.name'),
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.care-alliance-invitation',
            with: [
                'allianceName' => $this->allianceName,
                'organizationName' => $this->organizationName,
                'inviterName' => $this->inviterName,
                'dashboardUrl' => $this->dashboardUrl,
                'appName' => config('app.name'),
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
