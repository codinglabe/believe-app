<?php

namespace App\Mail;

use App\Models\EmailContact;
use App\Models\Organization;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class EmailInvite extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * Create a new message instance.
     */
    public function __construct(
        public Organization $organization,
        public EmailContact $contact,
        public ?string $customMessage = null
    ) {
        //
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Join {$this->organization->name} on " . config('app.name'),
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        // Get the organization owner's referral code for the host link
        $organization = $this->organization->load('user');
        $referralCode = $organization->user->referral_code ?? null;
        
        // Build the registration URL with referral code
        if ($referralCode) {
            $joinUrl = route('register.user') . '?ref=' . urlencode($referralCode);
        } else {
            // Fallback to regular register if no referral code
            $joinUrl = route('register.user');
        }
        
        return new Content(
            view: 'emails.email-invite',
            with: [
                'organization' => $this->organization,
                'contact' => $this->contact,
                'customMessage' => $this->customMessage,
                'joinUrl' => $joinUrl,
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
