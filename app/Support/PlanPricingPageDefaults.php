<?php

namespace App\Support;

final class PlanPricingPageDefaults
{
    /** Introductory monthly rate from marketing artwork. */
    public const INTRO_PRICE = 19.90;

    /** Standard monthly rate after introductory period. */
    public const STANDARD_PRICE = 34.00;

    /** One-time organization verification fee. */
    public const VERIFICATION_FEE = 10.00;

    /** Artwork “Everything included” layout: three columns of 8 + 8 + 7 items. */
    public const EVERYTHING_INCLUDED_COLUMN_SIZES = [8, 8, 7];

    /**
     * “Everything included” grid on /pricing (marketing artwork).
     *
     * @return list<string>
     */
    public static function everythingIncludedItems(): array
    {
        return array_merge(...self::everythingIncludedColumns());
    }

    /**
     * Three columns exactly as on the Unity Membership artwork.
     *
     * @return list<list<string>>
     */
    public static function everythingIncludedColumns(): array
    {
        return [
            [
                'Donations',
                'FundMe (Peer-to-Peer)',
                'Campaigns (Email, Social, Push)',
                'Sweepstakes',
                'Marketplace & Sell Products',
                'Merchant Deals Service Hub',
                'Volunteer Management',
                'Groups & Community',
            ],
            [
                'Supporter Management (CRM)',
                'Care Alliances',
                'Companion Hub',
                'Learning / Courses',
                'Events (Unlimited)',
                'Earning / Jobs',
                'News & Articles',
                'Unity Videos',
            ],
            [
                'Unity Live & Meet',
                'AI Assistant',
                'Kiosk Mode',
                'Push Notifications',
                'Analytics & Reporting',
                'Chat & Messaging',
                'And Much More',
            ],
        ];
    }

    /**
     * Usage-based add-ons — “Pay Only When You Grow”.
     *
     * @return list<array{name: string, price: string, description: string}>
     */
    public static function usageAddOns(): array
    {
        return [
            [
                'name' => 'Email Re-Ups',
                'price' => '$1 per 1,000 emails',
                'description' => 'Perfect for growth and newsletters',
            ],
            [
                'name' => 'AI Packs',
                'price' => '$5 per 50,000 tokens',
                'description' => 'High margin; encourages use',
            ],
            [
                'name' => 'SMS Messaging',
                'price' => '$0.015 per text',
                'description' => 'Opt-in only',
            ],
            [
                'name' => 'Sweepstakes Platform Fee',
                'price' => '4% of raised funds',
                'description' => 'Direct revenue',
            ],
        ];
    }

    /**
     * “What it could cost using other platforms” comparison table.
     *
     * @return list<array{service: string, platforms: string, cost: string, icon: string}>
     */
    public static function competitorRows(): array
    {
        return [
            [
                'service' => 'Donations',
                'platforms' => 'Donorbox / Classy',
                'cost' => '$0 – $99',
                'icon' => 'Heart',
            ],
            [
                'service' => 'Fundraising (Peer-to-Peer)',
                'platforms' => 'GoFundMe Pro / Classy',
                'cost' => '$100 – $300',
                'icon' => 'Sparkles',
            ],
            [
                'service' => 'Email Marketing',
                'platforms' => 'Mailchimp / SendGrid',
                'cost' => '$50 – $300',
                'icon' => 'Mail',
            ],
            [
                'service' => 'SMS Messaging',
                'platforms' => 'Twilio / TextMagic',
                'cost' => '$20 – $200+',
                'icon' => 'MessageSquare',
            ],
            [
                'service' => 'CRM / Supporter Management',
                'platforms' => 'Salesforce NPSP',
                'cost' => '$50 – $150',
                'icon' => 'Users',
            ],
            [
                'service' => 'Volunteer Management',
                'platforms' => 'VolunteerHub',
                'cost' => '$30 – $100',
                'icon' => 'Users',
            ],
            [
                'service' => 'Events',
                'platforms' => 'Eventbrite / Splash',
                'cost' => '$50 – $200',
                'icon' => 'Calendar',
            ],
            [
                'service' => 'Courses / Learning',
                'platforms' => 'Teachable / Kajabi',
                'cost' => '$39 – $199',
                'icon' => 'GraduationCap',
            ],
            [
                'service' => 'Marketplace / Store',
                'platforms' => 'Shopify',
                'cost' => '$39 – $105',
                'icon' => 'Store',
            ],
            [
                'service' => 'Community / Groups',
                'platforms' => 'Circle / Mighty Networks',
                'cost' => '$39 – $150',
                'icon' => 'Globe',
            ],
            [
                'service' => 'Video / Meetings',
                'platforms' => 'Zoom / StreamYard',
                'cost' => '$15 – $50',
                'icon' => 'Video',
            ],
            [
                'service' => 'AI Tools',
                'platforms' => 'OpenAI / Jasper',
                'cost' => '$20 – $100',
                'icon' => 'Bot',
            ],
            [
                'service' => 'Analytics / Reporting',
                'platforms' => 'Mixpanel / Tableau',
                'cost' => '$25 – $100',
                'icon' => 'BarChart3',
            ],
            [
                'service' => 'And Much More',
                'platforms' => '',
                'cost' => '',
                'icon' => 'Sparkles',
            ],
        ];
    }

    /**
     * All plan custom fields for /pricing (serialized from marketing artwork).
     *
     * @return list<array{key: string, label: string, value: string, type: string, icon: string, description: string|null}>
     */
    public static function pricingCustomFields(): array
    {
        return [
            [
                'key' => 'support_level',
                'label' => 'Support Level',
                'value' => 'Priority email support',
                'type' => 'text',
                'icon' => 'Headphones',
                'description' => null,
            ],
            [
                'key' => 'organization_verification',
                'label' => 'Organization Verification',
                'value' => (string) self::VERIFICATION_FEE,
                'type' => 'currency',
                'icon' => 'CheckCircle',
                'description' => null,
            ],
            [
                'key' => 'pricing_standard_price',
                'label' => 'Pricing Standard Price',
                'value' => (string) self::STANDARD_PRICE,
                'type' => 'text',
                'icon' => '',
                'description' => null,
            ],
            [
                'key' => 'pricing_everything_included_json',
                'label' => 'Pricing Everything Included Json',
                'value' => self::everythingIncludedJson(),
                'type' => 'text',
                'icon' => '',
                'description' => null,
            ],
            [
                'key' => 'pricing_usage_addons_json',
                'label' => 'Pricing Usage Addons Json',
                'value' => self::usageAddOnsJson(),
                'type' => 'text',
                'icon' => '',
                'description' => null,
            ],
            [
                'key' => 'pricing_competitor_rows_json',
                'label' => 'Pricing Competitor Rows Json',
                'value' => self::competitorRowsJson(),
                'type' => 'text',
                'icon' => '',
                'description' => null,
            ],
            [
                'key' => 'pricing_competitor_monthly_range',
                'label' => 'Pricing Competitor Monthly Range',
                'value' => '$600 – $2,000+',
                'type' => 'text',
                'icon' => '',
                'description' => null,
            ],
            [
                'key' => 'pricing_competitor_period',
                'label' => 'Pricing Competitor Period',
                'value' => '/ month',
                'type' => 'text',
                'icon' => '',
                'description' => null,
            ],
            [
                'key' => 'pricing_vs_badge',
                'label' => 'Pricing Vs Badge',
                'value' => '$600–$2k+',
                'type' => 'text',
                'icon' => '',
                'description' => null,
            ],
            [
                'key' => 'pricing_vs_fragmented_label',
                'label' => 'Pricing Vs Fragmented Label',
                'value' => 'fragmented stack',
                'type' => 'text',
                'icon' => '',
                'description' => null,
            ],
            [
                'key' => 'pricing_competitor_footer_label',
                'label' => 'Pricing Competitor Footer Label',
                'value' => 'Total (conservative estimate)',
                'type' => 'text',
                'icon' => '',
                'description' => null,
            ],
            [
                'key' => 'pricing_difference_blurb',
                'label' => 'Pricing Difference Blurb',
                'value' => 'Stop paying more for less. Use your budget for your mission, not for software.',
                'type' => 'text',
                'icon' => '',
                'description' => null,
            ],
            [
                'key' => 'pricing_sms_headline',
                'label' => 'Pricing Sms Headline',
                'value' => 'SMS messaging (pay-as-you-go)',
                'type' => 'text',
                'icon' => '',
                'description' => null,
            ],
            [
                'key' => 'pricing_sms_subtitle',
                'label' => 'Pricing Sms Subtitle',
                'value' => 'Only pay when you send messages.',
                'type' => 'text',
                'icon' => '',
                'description' => null,
            ],
            [
                'key' => 'pricing_sms_note',
                'label' => 'Pricing Sms Note',
                'value' => 'We show you the full cost upfront before you launch any campaign.',
                'type' => 'text',
                'icon' => '',
                'description' => null,
            ],
            [
                'key' => 'pricing_card_footer_tagline',
                'label' => 'Pricing Card Footer Tagline',
                'value' => 'ONE PLAN. ONE PRICE. ONE MISSION.',
                'type' => 'text',
                'icon' => '',
                'description' => null,
            ],
            [
                'key' => 'pricing_unlimited_access_summary',
                'label' => 'Pricing Unlimited Access Summary',
                'value' => 'Donations, FundMe (Peer-to-Peer), Campaigns (Email, Social, Push)',
                'type' => 'text',
                'icon' => '',
                'description' => null,
            ],
            [
                'key' => 'pricing_cancellation_policy',
                'label' => 'Pricing Cancellation Policy',
                'value' => 'Cancel anytime. No contracts. No hassle.',
                'type' => 'text',
                'icon' => '',
                'description' => null,
            ],
            [
                'key' => 'pricing_trial_card_copy',
                'label' => 'Pricing Trial Card Copy',
                'value' => 'Cancel anytime. No contracts. No hassle.',
                'type' => 'text',
                'icon' => '',
                'description' => null,
            ],
        ];
    }

    /**
     * Plan record attributes from marketing artwork (Unity Membership).
     *
     * @return array{price: float, description: string, is_popular: bool}
     */
    public static function featuredPlanAttributes(): array
    {
        return [
            'price' => self::INTRO_PRICE,
            'description' => 'Everything your organization needs in one membership.',
            'is_popular' => true,
        ];
    }

    public static function everythingIncludedJson(): string
    {
        return json_encode(
            ['columns' => self::everythingIncludedColumns()],
            JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR,
        );
    }

    public static function usageAddOnsJson(): string
    {
        return json_encode(self::usageAddOns(), JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    }

    public static function competitorRowsJson(): string
    {
        return json_encode(self::competitorRows(), JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    }
}
