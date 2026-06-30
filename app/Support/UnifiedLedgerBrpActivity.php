<?php

namespace App\Support;

final class UnifiedLedgerBrpActivity
{
    public const EARNED = 'earned';

    public const REDEEMED = 'redeemed';

    public const ADJUSTED = 'adjusted';

    public const EXPIRED = 'expired';

    public const NA = 'n/a';

    /** @return list<string> */
    public static function all(): array
    {
        return [
            self::EARNED,
            self::REDEEMED,
            self::ADJUSTED,
            self::EXPIRED,
            self::NA,
        ];
    }

    public static function label(string $activity): string
    {
        return match ($activity) {
            self::EARNED => 'Earned',
            self::REDEEMED => 'Redeemed',
            self::ADJUSTED => 'Adjusted',
            self::EXPIRED => 'Expired',
            default => 'N/A',
        };
    }
}
