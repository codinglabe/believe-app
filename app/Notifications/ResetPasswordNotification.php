<?php

namespace App\Notifications;

use App\Support\PasswordResetLinkBuilder;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Notifications\Messages\MailMessage;

/**
 * Legacy notification — production path uses {@see \App\Jobs\SendPasswordResetEmailJob}.
 */
class ResetPasswordNotification extends ResetPassword
{
    public ?string $domain = null;

    public function __construct(#[\SensitiveParameter] $token, ?string $domain = null)
    {
        parent::__construct($token);
        $this->domain = $domain;
    }

    /**
     * @param  mixed  $notifiable
     */
    public function toMail($notifiable): MailMessage
    {
        $appName = config('app.name', 'Believe In Unity');
        $appUrl = PasswordResetLinkBuilder::resolveBaseUrl($this->domain);

        return (new MailMessage)
            ->subject('Reset Your Password — '.$appName)
            ->view('emails.password-reset', [
                'resetUrl' => PasswordResetLinkBuilder::resetUrl($notifiable, $this->token, $this->domain),
                'userName' => $notifiable->name ?? null,
                'appName' => $appName,
                'appUrl' => $appUrl,
                'logoUrl' => $appUrl.'/favicon-96x96.png',
                'expireMinutes' => (int) config('auth.passwords.users.expire', 60),
            ]);
    }
}
