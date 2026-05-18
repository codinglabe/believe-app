<?php

namespace App\Support;

final class ConnectionHubType
{
    public const COMPANION = 'companion';

    public const LEARNING = 'learning';

    public const EVENTS = 'events';

    public const EARNING = 'earning';

    /** @var list<string> */
    public const VALUES = [
        self::COMPANION,
        self::LEARNING,
        self::EVENTS,
        self::EARNING,
    ];

    /**
     * Hub hero create links pass `?type=` to lock the Connection Hub listing type (not Earning).
     *
     * @var list<string>
     */
    public const LISTING_LOCK_VALUES = [
        self::COMPANION,
        self::LEARNING,
        self::EVENTS,
    ];

    /** @return array<string, string> */
    public static function labels(): array
    {
        return [
            self::COMPANION => 'Companion',
            self::LEARNING => 'Learning',
            self::EVENTS => 'Events',
            self::EARNING => 'Earning',
        ];
    }

    public static function label(string $type): string
    {
        return self::labels()[$type] ?? $type;
    }

    /** Registration-style UX (formerly "event"). */
    public static function usesEventSemantics(string $type): bool
    {
        return $type === self::EVENTS;
    }

    /** Normalize `?type=` from create URL; invalid or empty → null. */
    public static function normalizedListingTypeLockFromQuery(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }
        $t = strtolower(trim($value));

        return in_array($t, self::LISTING_LOCK_VALUES, true) ? $t : null;
    }
}
