<?php

namespace App\Mail;

use App\Models\Donation;
use App\Models\User;
use App\Services\Payments\BelievePointsRewardService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ManualDonationPendingReviewMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Donation $donation,
        public User $donor,
        public string $recipientLabel,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Payment confirmation received — under review — '.config('app.name'),
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.manual-donation-pending-review',
            with: [
                'donation' => $this->donation,
                'donor' => $this->donor,
                'recipientLabel' => $this->recipientLabel,
                'brpAmount' => BelievePointsRewardService::donationBrpAmountForUser($this->donor),
            ],
        );
    }
}
