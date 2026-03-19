<?php

namespace App\Services;

use App\Models\AdminSetting;

class SeoService
{
    public const PAGE_KEYS = [
        'home' => 'Home',
        'donate' => 'Donate',
        'about' => 'About Us',
        'contact' => 'Contact Us',
        'login' => 'Log In',
        'register' => 'Create Account',
        'register_user' => 'Register as Supporter',
        'register_organization' => 'Register Your Nonprofit',
        'find_supporters' => 'Find Supporters',
        'search' => 'Search',
        'organizations' => 'Organizations',
        'marketplace' => 'Marketplace',
        'courses' => 'Courses & Events',
        'all_events' => 'All Events',
        'terms_of_service' => 'Terms of Service',
        'privacy_policy' => 'Privacy Policy',
        'nonprofit_news' => 'Nonprofit News',
        'jobs' => 'Job Opportunities',
        'volunteer_opportunities' => 'Volunteer Opportunities',
        'social_feed' => 'Social Feed',
        'fundraise' => 'Raise Capital',
    ];

    /**
     * Default SEO values when nothing is stored (fallback).
     */
    public static function defaults(): array
    {
        return [
            'site_name' => config('app.name'),
            'default_description' => 'Connect with nonprofits and supporters. Donate, volunteer, and make an impact.',
            'default_share_image' => '', // Absolute URL for og:image when sharing (e.g. logo or hero)
            'pages' => [
                'home' => ['title' => 'Home', 'description' => 'Connect with verified nonprofits, donate securely, and make an impact. Find organizations by cause, location, and support the causes you care about.'],
                'donate' => ['title' => 'Donate', 'description' => 'Donate to verified 501(c)(3) nonprofits. 100% of your donation goes to your chosen organization. Search by name, cause, or location.'],
                'about' => ['title' => 'About Us', 'description' => 'Learn about our mission to connect supporters with verified nonprofits. We help donors give with confidence and organizations grow their impact.'],
                'contact' => ['title' => 'Contact Us', 'description' => 'Get in touch with Believe. Have questions about donations, nonprofits, or our platform? We\'re here to help.'],
                'login' => ['title' => 'Log In', 'description' => 'Sign in to your account to donate, follow causes, and manage your impact.'],
                'register' => ['title' => 'Create Account', 'description' => 'Join as a supporter or register your nonprofit. Create an account to donate, follow causes, and make an impact.'],
                'register_user' => ['title' => 'Register as Supporter', 'description' => 'Create your supporter account to discover nonprofits, donate, follow causes, and make an impact.'],
                'register_organization' => ['title' => 'Register Your Nonprofit', 'description' => 'Register your 501(c)(3) nonprofit to receive donations, manage campaigns, and grow your community of supporters.'],
                'find_supporters' => ['title' => 'Find Supporters', 'description' => 'Discover supporters who share your causes. Connect by interests, location, and activity. Grow your community.'],
                'search' => ['title' => 'Search', 'description' => 'Search supporters, organizations, and posts. Find people and causes that match your interests.'],
                'organizations' => ['title' => 'Organizations', 'description' => 'Browse verified nonprofits by cause, location, and name. Find organizations to support and donate to.'],
                'marketplace' => ['title' => 'Marketplace', 'description' => 'Discover products from verified nonprofits. Shop and support causes you care about.'],
                'courses' => ['title' => 'Courses & Events', 'description' => 'Discover courses and events from verified nonprofits. Learn new skills, attend workshops, and join community events—online or in person.'],
                'all_events' => ['title' => 'All Events', 'description' => 'Discover and join events from nonprofits. Find upcoming, ongoing, and past events by location, type, and date.'],
                'terms_of_service' => ['title' => 'Terms of Service', 'description' => 'Read the terms of service for using our platform. Understand your rights and responsibilities when donating and engaging with nonprofits.'],
                'privacy_policy' => ['title' => 'Privacy Policy', 'description' => 'Learn how we collect, use, and protect your personal information. Your privacy matters to us.'],
                'nonprofit_news' => ['title' => 'Nonprofit News', 'description' => 'Stay updated with news and stories from the nonprofit sector.'],
                'jobs' => ['title' => 'Job Opportunities', 'description' => 'Find job opportunities at nonprofits. Make an impact with your career.'],
                'volunteer_opportunities' => ['title' => 'Volunteer Opportunities', 'description' => 'Discover volunteer opportunities at nonprofits. Give your time and skills.'],
                'social_feed' => ['title' => 'Social Feed', 'description' => 'Stay connected with nonprofits and supporters. See updates, share posts, and engage with your community.'],
                'fundraise' => ['title' => 'Raise Capital | Community-Powered Crowdfunding', 'description' => 'Raise capital through community-powered crowdfunding. Start your application and connect with investors on Wefunder.'],
            ],
        ];
    }

    /**
     * Get full SEO settings (for admin form).
     */
    public static function getSettings(): array
    {
        $stored = AdminSetting::get('seo_settings', null);
        if (!$stored || !is_array($stored)) {
            return self::defaults();
        }
        $defaults = self::defaults();
        return [
            'site_name' => $stored['site_name'] ?? $defaults['site_name'],
            'default_description' => $stored['default_description'] ?? $defaults['default_description'],
            'default_share_image' => $stored['default_share_image'] ?? $defaults['default_share_image'],
            'pages' => array_merge($defaults['pages'], $stored['pages'] ?? []),
        ];
    }

    /**
     * Get default share image URL for og:image / twitter:image (must be absolute).
     */
    public static function getDefaultShareImage(): string
    {
        $settings = self::getSettings();
        $url = trim((string) ($settings['default_share_image'] ?? ''));
        if ($url !== '' && !str_starts_with($url, 'http')) {
            $url = url($url);
        }
        return $url;
    }

    /**
     * Get SEO for a specific page key (for controllers).
     * Returns ['title' => string, 'description' => string] or null to use controller default.
     */
    public static function forPage(string $key): array
    {
        $settings = self::getSettings();
        $page = $settings['pages'][$key] ?? null;
        if (!$page || empty($page['title'])) {
            $defaults = self::defaults();
            $page = $defaults['pages'][$key] ?? ['title' => $key, 'description' => $settings['default_description']];
        }
        return [
            'title' => (string) ($page['title'] ?? ''),
            'description' => isset($page['description']) ? (string) $page['description'] : '',
        ];
    }

    /**
     * Get site name from settings (for PageHead / title suffix).
     */
    public static function getSiteName(): string
    {
        $settings = self::getSettings();
        return (string) ($settings['site_name'] ?? config('app.name'));
    }

    /**
     * Save SEO settings (from admin form).
     */
    public static function saveSettings(array $data): void
    {
        $pages = [];
        foreach (array_keys(self::PAGE_KEYS) as $key) {
            $pages[$key] = [
                'title' => trim((string) ($data['pages'][$key]['title'] ?? '')),
                'description' => trim((string) ($data['pages'][$key]['description'] ?? '')),
            ];
        }
        AdminSetting::set('seo_settings', [
            'site_name' => trim((string) ($data['site_name'] ?? config('app.name'))),
            'default_description' => trim((string) ($data['default_description'] ?? '')),
            'default_share_image' => trim((string) ($data['default_share_image'] ?? '')),
            'pages' => $pages,
        ], 'json');
    }
}
