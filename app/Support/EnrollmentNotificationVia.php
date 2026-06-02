<?php

namespace App\Support;

class EnrollmentNotificationVia
{
    public const PUSH_EMAIL = 'push_email';

    public const PUSH = 'push';

    public const EMAIL = 'email';

    public static function allowed(): array
    {
        return [self::PUSH_EMAIL, self::PUSH, self::EMAIL];
    }

    public static function normalize(?string $value, string $default = self::PUSH_EMAIL): string
    {
        $value = is_string($value) ? strtolower(trim($value)) : '';

        return in_array($value, self::allowed(), true) ? $value : $default;
    }

    public static function label(string $via): string
    {
        return match (self::normalize($via)) {
            self::PUSH => 'Push',
            self::EMAIL => 'Email',
            default => 'Push / Email',
        };
    }
}
