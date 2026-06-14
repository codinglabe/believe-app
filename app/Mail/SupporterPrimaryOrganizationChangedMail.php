<?php

namespace App\Mail;

use App\Models\Organization;
use App\Models\SupporterPrimaryOrganizationChange;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class SupporterPrimaryOrganizationChangedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Organization $organization,
        public User $supporter,
        public SupporterPrimaryOrganizationChange $change,
        public string $dashboardUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Supporter changed primary organization — '.config('app.name'),
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.supporter-primary-organization-changed',
            with: [
                'organization' => $this->organization,
                'supporter' => $this->supporter,
                'change' => $this->change,
                'dashboardUrl' => $this->dashboardUrl,
                'newOrganizationName' => $this->change->newOrganization?->name ?? 'Another organization',
            ],
        );
    }
}
