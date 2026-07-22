<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ProjectCardMemberAssignedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $recipientName,
        public string $assignedByName,
        public string $cardTitle,
        public string $boardName,
        public string $cardUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "You're on \"{$this->cardTitle}\" — {$this->boardName}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.project-card-member-assigned',
        );
    }
}
