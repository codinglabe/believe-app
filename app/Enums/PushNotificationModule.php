<?php

namespace App\Enums;

enum PushNotificationModule: string
{
    case Campaigns = 'campaigns';
    case Donations = 'donations';
    case Events = 'events';
    case Email = 'email';
    case Courses = 'courses';
    case Marketplace = 'marketplace';
    case Volunteer = 'volunteer';
    case SocialFeed = 'social_feed';
    case UnityLive = 'unity_live';
    case UnityMeet = 'unity_meet';
    case Chat = 'chat';
    case WalletRewards = 'wallet_rewards';
    case Membership = 'membership';
    case Proximity = 'proximity';
    case DailyEngagement = 'daily_engagement';
    case Projects = 'projects';
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
            self::Campaigns->value => 'Campaigns',
            self::Donations->value => 'Donations',
            self::Events->value => 'Events',
            self::Email->value => 'Email',
            self::Courses->value => 'Courses',
            self::Marketplace->value => 'Marketplace',
            self::Volunteer->value => 'Volunteer Hub',
            self::SocialFeed->value => 'Social Feed & Groups',
            self::UnityLive->value => 'Unity Live',
            self::UnityMeet->value => 'Unity Meet',
            self::Chat->value => 'Chat',
            self::WalletRewards->value => 'BP Wallet & Rewards',
            self::Membership->value => 'Membership Management',
            self::Proximity->value => 'Proximity Alerts',
            self::DailyEngagement->value => 'Daily Engagement',
            self::Projects->value => 'Project Management',
            self::System->value => 'System',
        ];
    }
}
