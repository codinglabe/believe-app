<?php

namespace App\Support;

/** BIU unified ledger owner labels (actual names + platform constant). */
final class UnifiedLedgerOwner
{
    public const PLATFORM = 'BIU Platform';

    public const ORGANIZATION = 'Organization';

    public const MERCHANT = 'Merchant';

    public const SUPPORTER = 'Supporter';

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
        $value = trim((string) $value);
        if ($value !== '') {
            return $value;
        }

        if ($ownerType !== null && trim($ownerType) !== '') {
            return self::fromOwnerType($ownerType);
        }

        return null;
    }
}
