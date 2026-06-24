<?php

namespace App\Mail;

use App\Models\Transaction;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WalletTransactionMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Transaction $transaction,
        public User $user,
        public string $headline,
        public string $message,
        public string $walletUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->headline.' — '.config('app.name'),
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.wallet-transaction',
            with: [
                'transaction' => $this->transaction,
                'user' => $this->user,
                'headline' => $this->headline,
                'message' => $this->message,
                'walletUrl' => $this->walletUrl,
            ],
        );
    }
}
