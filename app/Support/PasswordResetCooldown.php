<?php

namespace App\Support;

use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

final class PasswordResetCooldown
{
    public static function seconds(string $broker = 'users'): int
    {
        return (int) config("auth.passwords.{$broker}.throttle", 60);
    }

    public static function key(string $email, string $broker = 'users'): string
    {
        return 'password-reset:'.$broker.':'.strtolower(trim($email));
    }

    public static function remaining(string $email, string $broker = 'users'): int
    {
        $key = self::key($email, $broker);

        if (! RateLimiter::tooManyAttempts($key, 1)) {
            return 0;
        }

        return RateLimiter::availableIn($key);
    }

    public static function enforce(string $email, string $broker = 'users'): void
    {
        $remaining = self::remaining($email, $broker);

        if ($remaining <= 0) {
            return;
        }

        throw ValidationException::withMessages([
            'email' => __('Please wait :seconds seconds before requesting another reset link.', [
                'seconds' => $remaining,
            ]),
        ]);
    }

    public static function record(string $email, string $broker = 'users'): int
    {
        $seconds = self::seconds($broker);
        RateLimiter::hit(self::key($email, $broker), $seconds);

        return $seconds;
    }

    public static function untilTimestamp(string $email, string $broker = 'users'): int
    {
        $remaining = self::remaining($email, $broker);

        return now()->addSeconds($remaining > 0 ? $remaining : self::seconds($broker))->getTimestamp();
    }
}
