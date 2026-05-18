<?php

namespace App\Mail;

use App\Models\Organization;
use App\Models\Form990Filing;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class Form990FilingReminder extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public Organization $organization;
    public Form990Filing $filing;

    /**
     * Create a new message instance.
     */
    public function __construct(Organization $organization, Form990Filing $filing)
    {
        $this->organization = $organization;
        $this->filing = $filing;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $daysOverdue = $this->filing->daysUntilDue();
        $subject = $daysOverdue < 0 
            ? "Action Required: Form 990 Filing Overdue for {$this->organization->name}"
            : "Reminder: Form 990 Filing Due Soon for {$this->organization->name}";

        return new Envelope(
            subject: $subject,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.form990-filing-reminder',
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
