<?php

namespace App\Support;

use Illuminate\Contracts\Auth\CanResetPassword;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\URL;

final class PasswordResetLinkBuilder
{
    /**
     * @param  CanResetPassword&object{email?: string, name?: string}  $user
     */
    public static function resetUrl(CanResetPassword $user, string $token, ?string $domain = null): string
    {
        $originalAppUrl = config('app.url');
        $baseUrl = self::resolveBaseUrl($domain);

        Config::set('app.url', $baseUrl);
        URL::forceRootUrl($baseUrl);

        try {
            return URL::route('password.reset', [
                'token' => $token,
                'email' => $user->getEmailForPasswordReset(),
            ], absolute: true);
        } finally {
            Config::set('app.url', $originalAppUrl);
            URL::forceRootUrl(null);
        }
    }

    public static function resolveBaseUrl(?string $domain = null): string
    {
        if ($domain) {
            $domain = trim($domain);

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
