<?php

namespace App\Support;

/** BIU unified ledger owner categories (client spec). */
final class UnifiedLedgerOwner
{
    public const SUPPORTER = 'Supporter';

    public const ORGANIZATION = 'Organization';

    public const MERCHANT = 'Merchant';

    public const PLATFORM = 'BIU Platform';

    /** @return list<string> */
    public static function all(): array
    {
        return [
            self::SUPPORTER,
            self::ORGANIZATION,
            self::MERCHANT,
            self::PLATFORM,
        ];
    }

    public static function fromOwnerType(?string $ownerType): string
    {
        return match (strtolower(trim((string) $ownerType))) {
            'organization', 'nonprofit' => self::ORGANIZATION,
            'merchant' => self::MERCHANT,
            'platform', 'biu', 'biu_platform' => self::PLATFORM,
            default => self::SUPPORTER,
        };
    }

    public static function normalize(?string $value, ?string $ownerType = null): ?string
    {
        if ($value !== null && in_array($value, self::all(), true)) {
            return $value;
        }

        if ($ownerType !== null && trim($ownerType) !== '') {
            return self::fromOwnerType($ownerType);
        }

        return null;
    }
}
