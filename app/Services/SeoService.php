<?php

namespace App\Services;

use App\Models\AdminSetting;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\ImageManager;

class SeoService
{
    private const SHARE_IMAGE_DISK = 'public';

    private const SHARE_IMAGE_DIR = 'seo/share';

    /** Public fallback when no admin share image is configured (must be crawlable). */
    private const FALLBACK_SHARE_IMAGE_PATH = '/web-app-manifest-192x192.png';

    /** Open Graph target size (1.91:1 — Facebook / WhatsApp / LinkedIn). */
    private const SOCIAL_IMAGE_WIDTH = 1200;

    private const SOCIAL_IMAGE_HEIGHT = 630;

    /** WhatsApp link previews often fail above ~300 KB. */
    private const SOCIAL_IMAGE_MAX_BYTES = 300000;

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
        'pricing' => 'pricing',
        'explore-by-cause.index' => 'explore_by_cause',
        'organizations.show' => 'organizations',
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
        'register_care_alliance' => 'Register a Unity Impact Alliance',
        'care_alliance_donate' => 'Unity Impact Alliance Campaign Donation',
        'find_supporters' => 'Find Supporters',
        'find_care_alliances' => 'Find Unity Impact Alliances',
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
        'pricing' => 'Pricing',
        'explore_by_cause' => 'Explore by Cause',
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
                'register_care_alliance' => ['title' => 'Register a Unity Impact Alliance', 'description' => 'Create a Unity Impact Alliance to coordinate member nonprofits, run shared campaigns, and split donations transparently.'],
                'care_alliance_donate' => ['title' => 'Donate to a Unity Impact Alliance Campaign', 'description' => 'Support a multi-organization campaign with a clear fund split before you pay.'],
                'find_supporters' => ['title' => 'Find Supporters', 'description' => 'Discover supporters who share your causes. Connect by interests, location, and activity. Grow your community.'],
                'find_care_alliances' => ['title' => 'Find Unity Impact Alliances', 'description' => 'Browse Unity Impact Alliances by cause and location. Explore member networks, campaigns, and public alliance hubs.'],
                'search' => ['title' => 'Search', 'description' => 'Search supporters, organizations, and posts. Find people and causes that match your interests.'],
                'organizations' => ['title' => 'Organizations', 'description' => 'Browse verified nonprofits by cause, location, and name. Find organizations to support and donate to.'],
                'marketplace' => ['title' => 'Marketplace', 'description' => 'Discover products from verified nonprofits. Shop and support causes you care about.'],
                'courses' => ['title' => 'Connection Hub', 'description' => 'Discover companion, learning, and meetup listings from verified nonprofits in Connection Hub. Connect around shared interests, gain new skills, and join gatherings—online or in person.'],
                'all_events' => ['title' => 'All Events', 'description' => 'Discover and join events from nonprofits. Find upcoming, ongoing, and past events by location, type, and date.'],
                'terms_of_service' => ['title' => 'Terms of Service', 'description' => 'Read the terms of service for using our platform. Understand your rights and responsibilities when donating and engaging with nonprofits.'],
                'privacy_policy' => ['title' => 'Privacy Policy', 'description' => 'Learn how we collect, use, and protect your personal information. Your privacy matters to us.'],
                'nonprofit_news' => ['title' => 'Nonprofit News', 'description' => 'Stay updated with news and stories from the nonprofit sector.'],
                'jobs' => ['title' => 'Job Opportunities', 'description' => 'Find job opportunities at nonprofits. Make an impact with your career.'],
                'volunteer_opportunities' => ['title' => 'Volunteer Opportunities', 'description' => 'Discover volunteer opportunities at nonprofits. Give your time and skills.'],
                'social_feed' => ['title' => 'Social Feed', 'description' => 'Stay connected with nonprofits and supporters. See updates, share posts, and engage with your community.'],
                'fundraise' => ['title' => 'Raise Capital | Community-Powered Crowdfunding', 'description' => 'Raise capital through community-powered crowdfunding. Start your application and connect with investors on Wefunder.'],
                'unity_loaves' => ['title' => 'Unity Loaves Directory', 'description' => 'Find feeding locations, donate money, and drop off non-perishable food. Search meal programs, food pantries, and community kitchens near you.'],
                'pricing' => ['title' => 'Pricing', 'description' => 'Affordable plans for nonprofits and supporters. Compare features for donations, CRM, volunteers, events, email, video meetings, marketplace, and fundraising.'],
                'explore_by_cause' => ['title' => 'Explore by Cause', 'description' => 'Discover nonprofits by cause — food, education, housing, mental health, youth, and more. Find organizations to support and donate to.'],
            ],
        ];
    }

    /**
     * SEO for a public organization profile (dynamic title, description, share image, JSON-LD).
     *
     * @param  array<string, mixed>  $organization  Transformed org payload from OrganizationController
     */
    public static function forOrganization(array $organization, ?string $tabLabel = null): array
    {
        $name = trim((string) ($organization['name'] ?? ''));
        if ($name === '') {
            $name = 'Organization';
        }

        $title = $tabLabel !== null && $tabLabel !== ''
            ? "{$tabLabel} | {$name}"
            : $name;

        $description = self::buildOrganizationDescription($organization);
        $shareImagePath = self::resolveOrganizationImagePath($organization);

        $payload = [
            'title' => $title,
            'description' => $description,
            'share_image' => self::getEffectiveShareImage(
                $shareImagePath !== '' ? self::resolveImageUrl($shareImagePath) : null
            ),
        ];

        $payload['json_ld'] = self::organizationJsonLd($organization, $payload['share_image']);

        return $payload;
    }

    /**
     * Default WebSite + Organization JSON-LD for the homepage.
     *
     * @return array<string, mixed>
     */
    public static function homePageJsonLd(): array
    {
        $siteName = self::getSiteName();
        $url = self::ensureAbsoluteUrl('/');
        $settings = self::getSettings();
        $description = trim((string) ($settings['default_description'] ?? ''));

        return [
            '@context' => 'https://schema.org',
            '@graph' => [
                [
                    '@type' => 'Organization',
                    '@id' => $url.'#organization',
                    'name' => $siteName,
                    'url' => $url,
                    'logo' => self::getDefaultShareImage(),
                    'description' => $description,
                ],
                [
                    '@type' => 'WebSite',
                    '@id' => $url.'#website',
                    'url' => $url,
                    'name' => $siteName,
                    'description' => $description,
                    'publisher' => ['@id' => $url.'#organization'],
                    'potentialAction' => [
                        '@type' => 'SearchAction',
                        'target' => [
                            '@type' => 'EntryPoint',
                            'urlTemplate' => self::ensureAbsoluteUrl('/organizations?search={search_term_string}'),
                        ],
                        'query-input' => 'required name=search_term_string',
                    ],
                ],
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $organization
     * @return array<string, mixed>
     */
    public static function organizationJsonLd(array $organization, string $logoUrl): array
    {
        $name = trim((string) ($organization['name'] ?? ''));
        $slug = (string) ($organization['registered_organization']['user']['slug'] ?? $organization['id'] ?? '');
        $profileUrl = self::ensureAbsoluteUrl('/organizations/'.$slug);

        $schema = [
            '@context' => 'https://schema.org',
            '@type' => 'NGO',
            'name' => $name !== '' ? $name : 'Organization',
            'url' => $profileUrl,
            'description' => self::buildOrganizationDescription($organization),
        ];

        if ($logoUrl !== '') {
            $schema['logo'] = $logoUrl;
            $schema['image'] = $logoUrl;
        }

        $city = trim((string) ($organization['city'] ?? ''));
        $state = trim((string) ($organization['state'] ?? ''));
        $street = trim((string) ($organization['street'] ?? ''));
        $zip = trim((string) ($organization['zip'] ?? ''));

        if ($street !== '' || $city !== '' || $state !== '') {
            $schema['address'] = array_filter([
                '@type' => 'PostalAddress',
                'streetAddress' => $street !== '' ? $street : null,
                'addressLocality' => $city !== '' ? $city : null,
                'addressRegion' => $state !== '' ? $state : null,
                'postalCode' => $zip !== '' ? $zip : null,
                'addressCountry' => 'US',
            ]);
        }

        $website = trim((string) ($organization['website'] ?? ''));
        if ($website !== '' && filter_var($website, FILTER_VALIDATE_URL)) {
            $schema['sameAs'] = [$website];
        }

        return $schema;
    }

    /**
     * @param  array<string, mixed>  $organization
     */
    private static function buildOrganizationDescription(array $organization): string
    {
        $mission = trim((string) ($organization['mission'] ?? ''));
        $description = trim((string) ($organization['description'] ?? ''));

        $skipMission = $mission === '' || str_contains(strtolower($mission), 'not available for unregistered');
        $skipDescription = $description === '' || str_contains(strtolower($description), 'not yet registered');

        if (! $skipMission) {
            return Str::limit(strip_tags($mission), 160, '…');
        }

        if (! $skipDescription) {
            return Str::limit(strip_tags($description), 160, '…');
        }

        $name = trim((string) ($organization['name'] ?? 'This nonprofit'));
        $city = trim((string) ($organization['city'] ?? ''));
        $state = trim((string) ($organization['state'] ?? ''));
        $location = trim("{$city}, {$state}", ', ');

        $classification = trim((string) ($organization['classification'] ?? ''));

        $parts = ["Learn about {$name}"];
        if ($location !== '') {
            $parts[] = "based in {$location}";
        }
        if ($classification !== '') {
            $parts[] = "({$classification})";
        }
        $parts[] = 'on Believe In Unity. Donate, follow, and support verified nonprofits.';

        return Str::limit(implode(' ', $parts), 160, '…');
    }

    /**
     * @param  array<string, mixed>  $organization
     */
    private static function resolveOrganizationImagePath(array $organization): string
    {
        $user = $organization['registered_organization']['user'] ?? null;
        if (! is_array($user)) {
            return '';
        }

        $cover = trim((string) ($user['cover_img'] ?? ''));
        if ($cover !== '') {
            return $cover;
        }

        return trim((string) ($user['image'] ?? ''));
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
            return self::socialShareImageUrl(self::resolveImageUrl($pageShare));
        }

        $settings = self::getSettings();
        $default = self::resolveImageUrl((string) ($settings['default_share_image'] ?? ''));
        if ($default !== '') {
            return self::socialShareImageUrl($default);
        }

        return self::ensureAbsoluteUrl(self::FALLBACK_SHARE_IMAGE_PATH);
    }

    /**
     * WhatsApp-friendly URL: optimized JPEG at 1200×630, ≤300 KB when source is on our disk.
     */
    public static function socialShareImageUrl(string $absoluteOrRelativeUrl): string
    {
        $absoluteOrRelativeUrl = trim($absoluteOrRelativeUrl);
        if ($absoluteOrRelativeUrl === '') {
            return '';
        }

        $relativePath = self::toPublicDiskPath($absoluteOrRelativeUrl);
        if ($relativePath !== null && Storage::disk(self::SHARE_IMAGE_DISK)->exists($relativePath)) {
            $socialPath = self::ensureSocialShareVariant($relativePath);

            return self::ensureAbsoluteUrl(Storage::disk(self::SHARE_IMAGE_DISK)->url($socialPath));
        }

        return self::ensureAbsoluteUrl(self::resolveImageUrl($absoluteOrRelativeUrl));
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
            $pageSeo = self::forPage($routeKey);
            if ($routeKey === 'home') {
                $pageSeo['json_ld'] = self::homePageJsonLd();
            }

            return self::buildOpenGraphPayload($pageSeo, $request);
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
        $imageDimensions = self::readImageDimensions($shareImage);

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
            'image_width' => $imageDimensions['width'],
            'image_height' => $imageDimensions['height'],
            'json_ld' => is_array($seo['json_ld'] ?? null) ? $seo['json_ld'] : null,
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

        $defaultsHome = $defaults['pages']['home'] ?? [];
        $headline = trim((string) ($home['title'] ?? ''));
        $subtitle = trim((string) ($home['subtitle'] ?? ''));

        return [
            'headline' => $headline !== '' ? $headline : trim((string) ($defaultsHome['title'] ?? '')),
            'subtitle' => $subtitle !== '' ? $subtitle : trim((string) ($defaultsHome['subtitle'] ?? '')),
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
     * Store an uploaded OG/share image (optimized 1200×630 JPEG, ≤300 KB for WhatsApp).
     */
    public static function storeShareImage(UploadedFile $file, string $basename): string
    {
        $filename = preg_replace('/[^a-z0-9_-]+/i', '-', $basename).'-'.time().'.jpg';
        $relativePath = self::SHARE_IMAGE_DIR.'/'.$filename;

        Storage::disk(self::SHARE_IMAGE_DISK)->makeDirectory(self::SHARE_IMAGE_DIR);
        self::writeOptimizedSocialJpeg($file->getRealPath(), $relativePath);

        return $relativePath;
    }

    /**
     * Delete a previously stored share image and its WhatsApp social variant.
     */
    public static function deleteShareImage(?string $path): void
    {
        $path = trim((string) $path);
        if ($path === '' || str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return;
        }

        $disk = Storage::disk(self::SHARE_IMAGE_DISK);
        $disk->delete($path);

        $socialVariant = self::socialVariantPathFor($path);
        if ($socialVariant !== null && $disk->exists($socialVariant)) {
            $disk->delete($socialVariant);
        }
    }

    /**
     * Rebuild WhatsApp-friendly variants for all stored SEO share images.
     *
     * @return list<string> Paths written or refreshed
     */
    public static function optimizeAllStoredShareImages(): array
    {
        $disk = Storage::disk(self::SHARE_IMAGE_DISK);
        if (! $disk->exists(self::SHARE_IMAGE_DIR)) {
            return [];
        }

        $written = [];
        foreach ($disk->files(self::SHARE_IMAGE_DIR) as $relativePath) {
            if (str_contains($relativePath, '-social.')) {
                continue;
            }

            $ext = strtolower(pathinfo($relativePath, PATHINFO_EXTENSION));
            if (! in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif'], true)) {
                continue;
            }

            self::ensureSocialShareVariant($relativePath);
            $written[] = self::socialVariantPathFor($relativePath) ?? $relativePath;
        }

        return array_values(array_unique($written));
    }

    /**
     * Create or refresh a ≤300 KB JPEG variant for WhatsApp / mobile previews.
     */
    public static function ensureSocialShareVariant(string $relativePath): string
    {
        if (str_contains($relativePath, '-social.')) {
            return $relativePath;
        }

        $socialPath = self::socialVariantPathFor($relativePath);
        if ($socialPath === null) {
            return $relativePath;
        }

        $disk = Storage::disk(self::SHARE_IMAGE_DISK);
        if (! $disk->exists($relativePath)) {
            return $relativePath;
        }

        if (self::isSocialReadyAtPath($relativePath)) {
            return $relativePath;
        }

        $needsRebuild = ! $disk->exists($socialPath);
        if (! $needsRebuild) {
            $sourceMtime = $disk->lastModified($relativePath);
            $socialMtime = $disk->lastModified($socialPath);
            $needsRebuild = $socialMtime < $sourceMtime
                || $disk->size($socialPath) > self::SOCIAL_IMAGE_MAX_BYTES;
        }

        if ($needsRebuild) {
            self::writeOptimizedSocialJpeg($disk->path($relativePath), $socialPath);
        }

        return $socialPath;
    }

    /**
     * @return array{width: int, height: int}
     */
    public static function readImageDimensions(string $shareImageUrl): array
    {
        $fallback = ['width' => self::SOCIAL_IMAGE_WIDTH, 'height' => self::SOCIAL_IMAGE_HEIGHT];
        if ($shareImageUrl === '') {
            return $fallback;
        }

        $relativePath = self::toPublicDiskPath($shareImageUrl);
        if ($relativePath !== null && Storage::disk(self::SHARE_IMAGE_DISK)->exists($relativePath)) {
            $size = @getimagesize(Storage::disk(self::SHARE_IMAGE_DISK)->path($relativePath));
            if ($size !== false) {
                return ['width' => (int) $size[0], 'height' => (int) $size[1]];
            }
        }

        $appUrl = rtrim((string) config('app.url'), '/');
        if ($appUrl !== '' && str_starts_with($shareImageUrl, $appUrl)) {
            $publicPath = parse_url($shareImageUrl, PHP_URL_PATH);
            if (is_string($publicPath) && $publicPath !== '') {
                $fullPath = public_path(ltrim($publicPath, '/'));
                if (is_file($fullPath)) {
                    $size = @getimagesize($fullPath);
                    if ($size !== false) {
                        return ['width' => (int) $size[0], 'height' => (int) $size[1]];
                    }
                }
            }
        }

        return $fallback;
    }

    private static function writeOptimizedSocialJpeg(string $sourcePath, string $targetRelativePath): void
    {
        $manager = new ImageManager(new Driver);
        $image = $manager->read($sourcePath);
        $image->cover(self::SOCIAL_IMAGE_WIDTH, self::SOCIAL_IMAGE_HEIGHT);

        $quality = 85;
        $encoded = (string) $image->toJpeg(quality: $quality);
        while (strlen($encoded) > self::SOCIAL_IMAGE_MAX_BYTES && $quality > 45) {
            $quality -= 5;
            $encoded = (string) $image->toJpeg(quality: $quality);
        }

        Storage::disk(self::SHARE_IMAGE_DISK)->put($targetRelativePath, $encoded);
    }

    private static function isSocialReadyAtPath(string $relativePath): bool
    {
        $disk = Storage::disk(self::SHARE_IMAGE_DISK);
        if (! $disk->exists($relativePath)) {
            return false;
        }

        if ($disk->size($relativePath) > self::SOCIAL_IMAGE_MAX_BYTES) {
            return false;
        }

        $ext = strtolower(pathinfo($relativePath, PATHINFO_EXTENSION));
        if (! in_array($ext, ['jpg', 'jpeg'], true)) {
            return false;
        }

        $size = @getimagesize($disk->path($relativePath));
        if ($size === false) {
            return false;
        }

        return (int) $size[0] === self::SOCIAL_IMAGE_WIDTH
            && (int) $size[1] === self::SOCIAL_IMAGE_HEIGHT;
    }

    private static function socialVariantPathFor(string $relativePath): ?string
    {
        if (str_contains($relativePath, '-social.')) {
            return null;
        }

        $info = pathinfo($relativePath);
        $dir = ($info['dirname'] ?? '') !== '.' ? $info['dirname'].'/' : '';

        return $dir.($info['filename'] ?? 'share').'-social.jpg';
    }

    private static function toPublicDiskPath(string $absoluteOrRelativeUrl): ?string
    {
        $absoluteOrRelativeUrl = trim($absoluteOrRelativeUrl);
        if ($absoluteOrRelativeUrl === '') {
            return null;
        }

        if (! str_starts_with($absoluteOrRelativeUrl, 'http://') && ! str_starts_with($absoluteOrRelativeUrl, 'https://')) {
            $path = ltrim($absoluteOrRelativeUrl, '/');
            if (str_starts_with($path, 'storage/')) {
                $path = substr($path, strlen('storage/'));
            }

            return $path !== '' ? $path : null;
        }

        $path = parse_url($absoluteOrRelativeUrl, PHP_URL_PATH);
        if (! is_string($path) || $path === '') {
            return null;
        }

        if (str_starts_with($path, '/storage/')) {
            return ltrim(substr($path, strlen('/storage/')), '/');
        }

        return null;
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
