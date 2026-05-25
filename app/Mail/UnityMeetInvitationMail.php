<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class UnityMeetInvitationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $recipientEmail,
        public string $hostName,
        public ?string $meetingTitle,
        public string $scheduledAtFormatted,
        public string $joinUrl,
        public string $meetingId,
        public bool $requiresPasscode,
        public ?string $passcode = null,
    ) {}

    public function envelope(): Envelope
    {
        $title = $this->meetingTitle ?: 'Unity Meet';

        return new Envelope(
            subject: "You're invited: {$title}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.unity-meet-invitation',
        );
    }
}
