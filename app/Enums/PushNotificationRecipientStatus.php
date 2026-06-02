<?php

namespace App\Enums;

enum PushNotificationRecipientStatus: string
{
    case Pending = 'pending';
    case Sent = 'sent';
    case Delivered = 'delivered';
    case Opened = 'opened';
    case Failed = 'failed';
    case Unsubscribed = 'unsubscribed';
    case InvalidToken = 'invalid_token';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
