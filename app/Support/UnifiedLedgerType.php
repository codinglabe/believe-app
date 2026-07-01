<?php

namespace App\Support;

final class UnifiedLedgerType
{
    public const MONEY = 'money';

    public const BP = 'bp';

    public const BRP = 'brp';

    /** @return list<string> */
    public static function all(): array
    {
        return [self::MONEY, self::BP, self::BRP];
    }

    public static function label(string $type): string
    {
        return match ($type) {
            self::BP => 'Believe Points (BP)',
            self::BRP => 'Believe Reward Points (BRP)',
            default => 'Money (USD)',
        };
    }

    public static function shortLabel(string $type): string
    {
        return match ($type) {
            self::BP => 'BP',
            self::BRP => 'BRP',
            default => 'Money',
        };
    }
}
