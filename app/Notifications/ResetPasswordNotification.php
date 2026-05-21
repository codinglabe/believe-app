<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\URL;

class ResetPasswordNotification extends ResetPassword implements ShouldQueue
{
    use Queueable;

    /**
     * @param  mixed  $notifiable
     */
    public function toMail($notifiable): MailMessage
    {
        $appName = config('app.name', 'Believe In Unity');
        $expireMinutes = (int) config('auth.passwords.users.expire', 60);

        return (new MailMessage)
            ->subject('Reset Your Password — '.$appName)
            ->view('emails.password-reset', [
                'resetUrl' => $this->resetUrl($notifiable),
                'userName' => $notifiable->name ?? null,
                'appName' => $appName,
                'logoUrl' => rtrim((string) config('app.url'), '/').'/favicon-96x96.png',
                'expireMinutes' => $expireMinutes,
            ]);
    }

    /**
     * @param  mixed  $notifiable
     */
    protected function resetUrl($notifiable): string
    {
        return URL::route('password.reset', [
            'token' => $this->token,
            'email' => $notifiable->getEmailForPasswordReset(),
        ], absolute: true);
    }
}
