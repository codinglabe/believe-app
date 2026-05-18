<?php

namespace App\Mail;

use App\Models\User;
use App\Models\OrganizationInvite;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OrganizationInviteMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $organizationName,
        public string $organizationEmail,
        public User $inviter,
        public string $ein,
        public OrganizationInvite $invite
    ) {
        //
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Join {$this->organizationName} on " . config('app.name'),
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        // Build the registration URL using the unique invite token
        $registerUrl = route('register.organization') . '?invite=' . urlencode($this->invite->token);
        
        return new Content(
            view: 'emails.organization-invite',
            with: [
                'organizationName' => $this->organizationName,
                'organizationEmail' => $this->organizationEmail,
                'inviter' => $this->inviter,
                'registerUrl' => $registerUrl,
                'ein' => $this->ein,
            ],
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
