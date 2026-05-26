<?php

namespace App\Support;

final class UnityMeetInviteNotifyVia
{
    public const EMAIL = 'email';

    public const BIU = 'biu';

    public const BOTH = 'both';

    public static function normalize(?string $value): string
    {
        $value = strtolower(trim((string) $value));

        return match ($value) {
            self::BIU => self::BIU,
            self::BOTH => self::BOTH,
            default => self::EMAIL,
        };
    }

    public static function usesEmailCredits(string $channel): bool
    {
        return in_array(self::normalize($channel), [self::EMAIL, self::BOTH], true);
    }

    public static function usesBiuNotification(string $channel): bool
    {
        return in_array(self::normalize($channel), [self::BIU, self::BOTH], true);
    }
}
