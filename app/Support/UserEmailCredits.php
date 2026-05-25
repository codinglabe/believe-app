<?php

namespace App\Support;

use App\Models\User;

final class UserEmailCredits
{
    public static function stats(User $user): array
    {
        $included = (int) ($user->emails_included ?? 0);
        $used = (int) ($user->emails_used ?? 0);
        $left = max(0, $included - $used);

        return [
            'emails_included' => $included,
            'emails_used' => $used,
            'emails_left' => $left,
        ];
    }

    public static function remaining(User $user): int
    {
        return self::stats($user)['emails_left'];
    }

    public static function canSend(User $user, int $count = 1): bool
    {
        if ($count < 1) {
            return true;
        }

        return self::remaining($user) >= $count;
    }

    public static function consume(User $user, int $count = 1): void
    {
        if ($count < 1) {
            return;
        }

        $user->increment('emails_used', $count);
    }

    public static function insufficientMessage(User $user, int $needed = 1): string
    {
        $left = self::remaining($user);

        if ($needed <= 1) {
            return 'No email credits remaining. Buy email credits before sending invitations.';
        }

        return "You have {$left} email credit(s) remaining, but you're trying to send {$needed} invitation(s). Buy more email credits before sending.";
    }
}
