<?php

namespace App\Mail;

use App\Models\Form1023Application;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class Form1023PaymentReminder extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public $application;
    public $organization;
    public $applicationFee;

    /**
     * Create a new message instance.
     */
    public function __construct(Form1023Application $application)
    {
        $this->application = $application;
        $this->organization = $application->organization;
        $this->applicationFee = $application->amount;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Complete Your Form 1023 Application Payment - Action Required',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.form1023-payment-reminder',
            with: [
                'application' => $this->application,
                'organization' => $this->organization,
                'applicationFee' => $this->applicationFee,
                'applicationUrl' => route('form1023.apply.view', $this->application),
                'paymentUrl' => route('form1023.apply.view', $this->application),
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

