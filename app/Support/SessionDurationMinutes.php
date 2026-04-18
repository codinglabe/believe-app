<?php

namespace App\Support;

/**
 * Per-session length for Connection Hub listings (dropdown in UI).
 */
final class SessionDurationMinutes
{
    /** @var list<int> */
    public const VALUES = [30, 45, 60, 75, 90, 105, 120];

    public static function default(): int
    {
        return 60;
    }
}
