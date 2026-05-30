<?php

namespace App\Mail;

use App\Models\User;
use App\Support\PasswordResetLinkBuilder;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PasswordResetMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        #[\SensitiveParameter] public string $token,
        public ?string $domain = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Reset Your Password — '.config('app.name', 'Believe In Unity'),
        );
    }

    public function content(): Content
    {
        $appName = config('app.name', 'Believe In Unity');
        $appUrl = PasswordResetLinkBuilder::resolveBaseUrl($this->domain);

        return new Content(
            view: 'emails.password-reset',
            with: [
                'resetUrl' => PasswordResetLinkBuilder::resetUrl($this->user, $this->token, $this->domain),
                'userName' => $this->user->name ?? null,
                'appName' => $appName,
                'appUrl' => $appUrl,
                'logoUrl' => $appUrl.'/favicon-96x96.png',
                'expireMinutes' => (int) config('auth.passwords.users.expire', 60),
            ],
        );
    }
}
