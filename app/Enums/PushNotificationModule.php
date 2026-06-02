<?php

namespace App\Enums;

enum PushNotificationModule: string
{
    case Donations = 'donations';
    case Campaigns = 'campaigns';
    case Events = 'events';
    case Email = 'email';
    case Courses = 'courses';
    case Marketplace = 'marketplace';
    case Volunteer = 'volunteer';
    case System = 'system';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /**
     * @return array<string, string>
     */
    public static function labels(): array
    {
        return [
            self::Donations->value => 'Donations',
            self::Campaigns->value => 'Campaigns',
            self::Events->value => 'Events',
            self::Email->value => 'Email',
            self::Courses->value => 'Courses',
            self::Marketplace->value => 'Marketplace',
            self::Volunteer->value => 'Volunteer',
            self::System->value => 'System',
        ];
    }
}
