<?php

namespace App\Enums;

enum PushNotificationLogStatus: string
{
    case Draft = 'draft';
    case Scheduled = 'scheduled';
    case Processing = 'processing';
    case Sent = 'sent';
    case Completed = 'completed';
    case Failed = 'failed';
    case Cancelled = 'cancelled';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
