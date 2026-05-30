<?php

namespace App\Services;

use App\Models\AdminSetting;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class SeoService
{
    private const SHARE_IMAGE_DISK = 'public';

    private const SHARE_IMAGE_DIR = 'seo/share';

    /** Public fallback when no admin share image is configured (must be crawlable). */
    private const FALLBACK_SHARE_IMAGE_PATH = '/web-app-manifest-192x192.png';

    /** @var array<string, string> Laravel route name => SeoService page key */
    private const ROUTE_PAGE_KEYS = [
        'home' => 'home',
        'about' => 'about',
        'contact' => 'contact',
        'donate' => 'donate',
        'organizations' => 'organizations',
        'marketplace.index' => 'marketplace',
        'privacy.policy' => 'privacy_policy',
        'terms.service' => 'terms_of_service',
        'register' => 'register',
        'register.user' => 'register_user',
        'register.organization' => 'register_organization',
        'register.care-alliance' => 'register_care_alliance',
        'login' => 'login',
        'password.request' => 'forgot_password',
        'password.reset' => 'reset_password',
        'social-feed.index' => 'social_feed',
        'nonprofit.news' => 'nonprofit_news',
        'jobs.index' => 'jobs',
        'volunteer-opportunities.index' => 'volunteer_opportunities',
        'fundraise' => 'fundraise',
        'find-supporters.index' => 'find_supporters',
        'find-care-alliances.index' => 'find_care_alliances',
        'social-feed.search' => 'search',
        'unity-loaves.index' => 'unity_loaves',
        'course.index' => 'courses',
        'alleventsPage' => 'all_events',
    ];
    public const PAGE_KEYS = [
        'home' => 'Home',
        'donate' => 'Donate',
        'about' => 'About Us',
        'contact' => 'Contact Us',
        'login' => 'Log In',
        'forgot_password' => 'Forgot Password',
        'reset_password' => 'Reset Password',
        'register' => 'Create Account',
        'register_user' => 'Register as Supporter',
        'register_organization' => 'Register Your Nonprofit',
        'register_care_alliance' => 'Register a Care Alliance',
        'care_alliance_donate' => 'Care Alliance Campaign Donation',
        'find_supporters' => 'Find Supporters',
        'find_care_alliances' => 'Find Care Alliances',
        'search' => 'Search',
        'organizations' => 'Organizations',
        'marketplace' => 'Marketplace',
        'courses' => 'Connection Hub',
        'all_events' => 'All Events',
        'terms_of_service' => 'Terms of Service',
        'privacy_policy' => 'Privacy Policy',
        'nonprofit_news' => 'Nonprofit News',
        'jobs' => 'Job Opportunities',
        'volunteer_opportunities' => 'Volunteer Opportunities',
        'social_feed' => 'Social Feed',
        'fundraise' => 'Raise Capital',
        'unity_loaves' => 'Unity Loaves Directory',
    ];

    /**
     * Default SEO values when nothing is stored (fallback).
     */
    public static function defaults(): array
    {
        return [
            'site_name' => config('app.name'),
            'default_description' => 'The affordable all-in-one operating system for nonprofits — donations, CRM, volunteers, events, email, video meetings, marketplace, and fundraising.',
            'default_share_image' => '', // Absolute URL for og:image when sharing (e.g. logo or hero)
            'pages' => [
                'home' => [
                    'title' => 'The Affordable All-in-One Operating System for Nonprofits',
                    'subtitle' => 'Donations • CRM • Volunteers • Events • Email • Video Meetings • Marketplace • Fundraising',
                    'description' => 'Donations, CRM, volunteers, events, email, video meetings, marketplace, and fundraising — one affordable platform built for nonprofits.',
                    'share_image' => '',
                ],
                'donate' => ['title' => 'Donate', 'description' => 'Donate to verified 501(c)(3) nonprofits. 100% of your donation goes to your chosen organization. Search by name, cause, or location.'],
                'about' => ['title' => 'About Us', 'description' => 'Learn about our mission to connect supporters with verified nonprofits. We help donors give with confidence and organizations grow their impact.'],
                'contact' => ['title' => 'Contact Us', 'description' => 'Get in touch with Believe. Have questions about donations, nonprofits, or our platform? We\'re here to help.'],
                'login' => ['title' => 'Log In', 'description' => 'Sign in to your account to donate, follow causes, and manage your impact.'],
                'forgot_password' => ['title' => 'Forgot Password', 'description' => 'Request a password reset link for your Believe In Unity account.'],
                'reset_password' => ['title' => 'Reset Password', 'description' => 'Set a new password for your Believe In Unity account.'],
                'register' => ['title' => 'Create Account', 'description' => 'Join as a supporter or register your nonprofit. Create an account to donate, follow causes, and make an impact.'],
                'register_user' => ['title' => 'Register as Supporter', 'description' => 'Create your supporter account to discover nonprofits, donate, follow causes, and make an impact.'],
                'register_organization' => ['title' => 'Register Your Nonprofit', 'description' => 'Register your 501(c)(3) nonprofit to receive donations, manage campaigns, and grow your community of supporters.'],
                'register_care_alliance' => ['title' => 'Register a Care Alliance', 'description' => 'Create a Care Alliance to coordinate member nonprofits, run shared campaigns, and split donations transparently.'],
                'care_alliance_donate' => ['title' => 'Donate to a Care Alliance Campaign', 'description' => 'Support a multi-organization campaign with a clear fund split before you pay.'],
                'find_supporters' => ['title' => 'Find Supporters', 'description' => 'Discover supporters who share your causes. Connect by interests, location, and activity. Grow your community.'],
                'find_care_alliances' => ['title' => 'Find Care Alliances', 'description' => 'Browse Care Alliances by cause and location. Explore member networks, campaigns, and public alliance hubs.'],
                'search' => ['title' => 'Search', 'description' => 'Search supporters, organizations, and posts. Find people and causes that match your interests.'],
                'organizations' => ['title' => 'Organizations', 'description' => 'Browse verified nonprofits by cause, location, and name. Find organizations to support and donate to.'],
                'marketplace' => ['title' => 'Marketplace', 'description' => 'Discover products from verified nonprofits. Shop and support causes you care about.'],
                'courses' => ['title' => 'Connection Hub', 'description' => 'Discover courses and events from verified nonprofits in Connection Hub. Learn new skills, attend workshops, and join community events—online or in person.'],
                'all_events' => ['title' => 'All Events', 'description' => 'Discover and join events from nonprofits. Find upcoming, ongoing, and past events by location, type, and date.'],
                'terms_of_service' => ['title' => 'Terms of Service', 'description' => 'Read the terms of service for using our platform. Understand your rights and responsibilities when donating and engaging with nonprofits.'],
                'privacy_policy' => ['title' => 'Privacy Policy', 'description' => 'Learn how we collect, use, and protect your personal information. Your privacy matters to us.'],
                'nonprofit_news' => ['title' => 'Nonprofit News', 'description' => 'Stay updated with news and stories from the nonprofit sector.'],
                'jobs' => ['title' => 'Job Opportunities', 'description' => 'Find job opportunities at nonprofits. Make an impact with your career.'],
                'volunteer_opportunities' => ['title' => 'Volunteer Opportunities', 'description' => 'Discover volunteer opportunities at nonprofits. Give your time and skills.'],
                'social_feed' => ['title' => 'Social Feed', 'description' => 'Stay connected with nonprofits and supporters. See updates, share posts, and engage with your community.'],
                'fundraise' => ['title' => 'Raise Capital | Community-Powered Crowdfunding', 'description' => 'Raise capital through community-powered crowdfunding. Start your application and connect with investors on Wefunder.'],
                'unity_loaves' => ['title' => 'Unity Loaves Directory', 'description' => 'Find feeding locations, donate money, and drop off non-perishable food. Search meal programs, food pantries, and community kitchens near you.'],
            ],
        ];
    }

    /**
     * Get full SEO settings (for admin form).
     */
    public static function getSettings(): array
    {
        $stored = AdminSetting::get('seo_settings', null);
        if (! $stored || ! is_array($stored)) {
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
        $configured = self::resolveImageUrl((string) ($settings['default_share_image'] ?? ''));

        return self::getEffectiveShareImage($configured !== '' ? $configured : null);
    }

    /**
     * Resolve share image: explicit page image, admin default, then site fallback asset.
     */
    public static function getEffectiveShareImage(?string $pageSharePathOrUrl = null): string
    {
        $pageShare = trim((string) $pageSharePathOrUrl);
        if ($pageShare !== '') {
            return self::ensureAbsoluteUrl(self::resolveImageUrl($pageShare));
        }

        $settings = self::getSettings();
        $default = self::resolveImageUrl((string) ($settings['default_share_image'] ?? ''));
        if ($default !== '') {
            return self::ensureAbsoluteUrl($default);
        }

        return self::ensureAbsoluteUrl(self::FALLBACK_SHARE_IMAGE_PATH);
    }

    /**
     * Force a fully-qualified URL (HTTPS in production) for social crawlers.
     */
    public static function ensureAbsoluteUrl(string $url): string
    {
        $url = trim($url);
        if ($url === '') {
            return '';
        }

        if (str_starts_with($url, '//')) {
            $url = 'https:'.$url;
        }

        if (! str_starts_with($url, 'http://') && ! str_starts_with($url, 'https://')) {
            $url = url($url);
        }

        if (app()->environment('production') && str_starts_with($url, 'http://')) {
            $url = 'https://'.substr($url, 7);
        }

        return $url;
    }

    /**
     * Open Graph payload for the root Blade template (social crawlers do not run JS).
     *
     * @param  array<string, mixed>  $inertiaPage
     * @return array{title: string, og_title: string, description: string, url: string, share_image: string, site_name: string, image_type: string}
     */
    public static function openGraphForView(array $inertiaPage, \Illuminate\Http\Request $request): array
    {
        $props = $inertiaPage['props'] ?? [];
        $inertiaSeo = is_array($props['seo'] ?? null) ? $props['seo'] : null;

        if (is_array($inertiaSeo) && trim((string) ($inertiaSeo['title'] ?? '')) !== '') {
            return self::buildOpenGraphPayload($inertiaSeo, $request);
        }

        $routeKey = self::routeToPageKey($request->route()?->getName());
        if ($routeKey !== null) {
            return self::buildOpenGraphPayload(self::forPage($routeKey), $request);
        }

        $settings = self::getSettings();

        return self::buildOpenGraphPayload([
            'title' => self::getSiteName(),
            'description' => (string) ($settings['default_description'] ?? ''),
            'share_image' => self::getDefaultShareImage(),
        ], $request);
    }

    /**
     * @param  array<string, mixed>  $seo
     * @return array{title: string, og_title: string, description: string, url: string, share_image: string, site_name: string, image_type: string}
     */
    public static function buildOpenGraphPayload(array $seo, \Illuminate\Http\Request $request): array
    {
        $siteName = self::getSiteName();
        $title = trim((string) ($seo['title'] ?? ''));
        $description = trim((string) ($seo['description'] ?? ''));
        $settings = self::getSettings();

        if ($description === '') {
            $description = trim((string) ($settings['default_description'] ?? ''));
        }

        $shareImage = self::getEffectiveShareImage(trim((string) ($seo['share_image'] ?? '')));

        $ogTitle = $title !== '' ? $title : $siteName;
        if ($title !== '' && $siteName !== '' && ! str_contains($title, $siteName)) {
            $ogTitle = "{$title} | {$siteName}";
        }

        return [
            'title' => $title !== '' ? $title : $siteName,
            'og_title' => $ogTitle,
            'description' => $description,
            'url' => self::ensureAbsoluteUrl($request->url()),
            'share_image' => $shareImage,
            'site_name' => $siteName,
            'image_type' => self::guessImageMimeType($shareImage),
        ];
    }

    public static function routeToPageKey(?string $routeName): ?string
    {
        if ($routeName === null || $routeName === '') {
            return null;
        }

        return self::ROUTE_PAGE_KEYS[$routeName] ?? null;
    }

    private static function guessImageMimeType(string $url): string
    {
        $path = strtolower(parse_url($url, PHP_URL_PATH) ?: '');

        return match (true) {
            str_ends_with($path, '.png') => 'image/png',
            str_ends_with($path, '.webp') => 'image/webp',
            str_ends_with($path, '.gif') => 'image/gif',
            str_ends_with($path, '.svg') => 'image/svg+xml',
            default => 'image/jpeg',
        };
    }

    /**
     * Resolve a stored path or absolute URL to a public absolute URL.
     */
    public static function resolveImageUrl(string $pathOrUrl): string
    {
        $pathOrUrl = trim($pathOrUrl);
        if ($pathOrUrl === '') {
            return '';
        }

        if (str_starts_with($pathOrUrl, 'http://') || str_starts_with($pathOrUrl, 'https://')) {
            return self::ensureAbsoluteUrl($pathOrUrl);
        }

        if (str_starts_with($pathOrUrl, '/')) {
            return self::ensureAbsoluteUrl(url($pathOrUrl));
        }

        return self::ensureAbsoluteUrl(Storage::disk(self::SHARE_IMAGE_DISK)->url($pathOrUrl));
    }

    /**
     * Homepage hero copy (editable from Admin → SEO → Home).
     */
    public static function getHomeHero(): array
    {
        $settings = self::getSettings();
        $defaults = self::defaults();
        $home = array_merge($defaults['pages']['home'] ?? [], $settings['pages']['home'] ?? []);

        return [
            'headline' => trim((string) ($home['title'] ?? '')),
            'subtitle' => trim((string) ($home['subtitle'] ?? '')),
        ];
    }

    /**
     * Get SEO for a specific page key (for controllers).
     * Returns title, description, and optional share_image URL.
     */
    public static function forPage(string $key): array
    {
        $settings = self::getSettings();
        $defaults = self::defaults();
        $page = array_merge(
            $defaults['pages'][$key] ?? ['title' => $key, 'description' => $settings['default_description'], 'share_image' => ''],
            $settings['pages'][$key] ?? []
        );

        if (empty($page['title'])) {
            $page['title'] = $defaults['pages'][$key]['title'] ?? $key;
        }

        $shareImage = trim((string) ($page['share_image'] ?? ''));

        return [
            'title' => (string) ($page['title'] ?? ''),
            'description' => isset($page['description']) ? (string) $page['description'] : '',
            'share_image' => self::getEffectiveShareImage($shareImage !== '' ? self::resolveImageUrl($shareImage) : null),
        ];
    }

    /**
     * Store an uploaded OG/share image and return the storage path.
     */
    public static function storeShareImage(UploadedFile $file, string $basename): string
    {
        $extension = strtolower($file->getClientOriginalExtension() ?: 'jpg');
        $filename = preg_replace('/[^a-z0-9_-]+/i', '-', $basename).'-'.time().'.'.$extension;

        return $file->storeAs(self::SHARE_IMAGE_DIR, $filename, self::SHARE_IMAGE_DISK);
    }

    /**
     * Delete a previously stored share image (ignores external URLs).
     */
    public static function deleteShareImage(?string $path): void
    {
        $path = trim((string) $path);
        if ($path === '' || str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return;
        }

        Storage::disk(self::SHARE_IMAGE_DISK)->delete($path);
    }

    /**
     * Settings payload for the admin SEO form (includes resolved image URLs).
     */
    public static function getSettingsForAdmin(): array
    {
        $settings = self::getSettings();
        $settings['default_share_image_url'] = self::resolveImageUrl((string) ($settings['default_share_image'] ?? ''));

        foreach (array_keys(self::PAGE_KEYS) as $key) {
            $page = $settings['pages'][$key] ?? [];
            $settings['pages'][$key] = array_merge(
                ['title' => '', 'description' => '', 'subtitle' => '', 'share_image' => ''],
                is_array($page) ? $page : []
            );
            $settings['pages'][$key]['share_image_url'] = self::resolveImageUrl((string) ($settings['pages'][$key]['share_image'] ?? ''));
        }

        return $settings;
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
        $existing = AdminSetting::get('seo_settings', null);
        $existingPages = is_array($existing) ? ($existing['pages'] ?? []) : [];

        $pages = [];
        foreach (array_keys(self::PAGE_KEYS) as $key) {
            $existingPage = is_array($existingPages[$key] ?? null) ? $existingPages[$key] : [];
            $incoming = is_array($data['pages'][$key] ?? null) ? $data['pages'][$key] : [];

            $pages[$key] = [
                'title' => trim((string) ($incoming['title'] ?? '')),
                'description' => trim((string) ($incoming['description'] ?? '')),
                'subtitle' => $key === 'home' ? trim((string) ($incoming['subtitle'] ?? '')) : trim((string) ($existingPage['subtitle'] ?? '')),
                'share_image' => trim((string) ($incoming['share_image'] ?? ($existingPage['share_image'] ?? ''))),
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
