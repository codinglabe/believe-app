<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\URL;

class ResetPasswordNotification extends ResetPassword implements ShouldQueue
{
    use Queueable;

    /**
     * Request origin (scheme + host [+ port]) captured when the reset was requested.
     */
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
        $expireMinutes = (int) config('auth.passwords.users.expire', 60);
        $appUrl = $this->resolveBaseUrl();

        return (new MailMessage)
            ->subject('Reset Your Password — '.$appName)
            ->view('emails.password-reset', [
                'resetUrl' => $this->resetUrl($notifiable),
                'userName' => $notifiable->name ?? null,
                'appName' => $appName,
                'appUrl' => $appUrl,
                'logoUrl' => $appUrl.'/favicon-96x96.png',
                'expireMinutes' => $expireMinutes,
            ]);
    }

    /**
     * @param  mixed  $notifiable
     */
    protected function resetUrl($notifiable): string
    {
        $originalAppUrl = config('app.url');
        $baseUrl = $this->resolveBaseUrl();

        Config::set('app.url', $baseUrl);
        URL::forceRootUrl($baseUrl);

        try {
            return URL::route('password.reset', [
                'token' => $this->token,
                'email' => $notifiable->getEmailForPasswordReset(),
            ], absolute: true);
        } finally {
            Config::set('app.url', $originalAppUrl);
            URL::forceRootUrl(null);
        }
    }

    /**
     * Absolute app base URL for assets and footer links (domain from request, else APP_URL).
     */
    protected function resolveBaseUrl(): string
    {
        if ($this->domain) {
            $domain = trim($this->domain);

            if (! str_contains($domain, '://')) {
                $domain = 'https://'.$domain;
            }

            return rtrim($domain, '/');
        }

        $envAppUrl = env('APP_URL');
        if ($envAppUrl) {
            return rtrim((string) $envAppUrl, '/');
        }

        return rtrim((string) config('app.url'), '/');
    }
}
