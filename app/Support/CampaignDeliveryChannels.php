<?php

namespace App\Support;

final class CampaignDeliveryChannels
{
    public const PUSH = 'push';

    public const WHATSAPP = 'whatsapp';

    public const WEB = 'web';

    public const EMAIL = 'email';

    /** @var list<string> */
    public const VALUES = [
        self::PUSH,
        self::WHATSAPP,
        self::WEB,
        self::EMAIL,
    ];

    public static function validationRule(): string
    {
        return 'in:'.implode(',', self::VALUES);
    }

    public static function includesEmail(array $channels): bool
    {
        return in_array(self::EMAIL, $channels, true);
    }
}
