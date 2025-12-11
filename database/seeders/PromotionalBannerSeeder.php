<?php

namespace Database\Seeders;

use App\Models\PromotionalBanner;
use Illuminate\Database\Seeder;
use Carbon\Carbon;

class PromotionalBannerSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Clear existing banners (optional - comment out if you want to keep existing ones)
        // PromotionalBanner::truncate();

        $banners = [
            [
                'title' => 'Welcome to Our Platform',
                'type' => 'text',
                'text_content' => 'Join thousands of organizations making a difference. Start your journey today!',
                'image_url' => null,
                'external_link' => 'https://example.com/get-started',
                'is_active' => true,
                'display_order' => 1,
                'starts_at' => null,
                'ends_at' => Carbon::now()->addMonths(3),
                'background_color' => '#3b82f6',
                'text_color' => '#ffffff',
                'description' => 'Main welcome banner for new users',
            ],
            [
                'title' => 'Special Offer',
                'type' => 'text',
                'text_content' => '🎉 Limited Time: Get 50% off on premium features. Upgrade now!',
                'image_url' => null,
                'external_link' => 'https://example.com/pricing',
                'is_active' => true,
                'display_order' => 2,
                'starts_at' => Carbon::now(),
                'ends_at' => Carbon::now()->addDays(30),
                'background_color' => '#10b981',
                'text_color' => '#ffffff',
                'description' => 'Special promotional offer banner',
            ],
            [
                'title' => 'New Features Available',
                'type' => 'text',
                'text_content' => 'Check out our latest updates: Enhanced analytics, better reporting, and more!',
                'image_url' => null,
                'external_link' => 'https://example.com/features',
                'is_active' => true,
                'display_order' => 3,
                'starts_at' => null,
                'ends_at' => null,
                'background_color' => '#8b5cf6',
                'text_color' => '#ffffff',
                'description' => 'Announcement banner for new features',
            ],
            [
                'title' => 'Upcoming Event',
                'type' => 'text',
                'text_content' => '📅 Annual Nonprofit Conference 2024 - Register Now! Early bird pricing available.',
                'image_url' => null,
                'external_link' => 'https://example.com/events/conference-2024',
                'is_active' => true,
                'display_order' => 4,
                'starts_at' => Carbon::now(),
                'ends_at' => Carbon::now()->addMonths(2),
                'background_color' => '#f59e0b',
                'text_color' => '#ffffff',
                'description' => 'Event promotion banner',
            ],
            [
                'title' => 'Community Spotlight',
                'type' => 'text',
                'text_content' => '🌟 Thank you to all our amazing organizations! Together we\'ve impacted over 100,000 lives.',
                'image_url' => null,
                'external_link' => 'https://example.com/community',
                'is_active' => true,
                'display_order' => 5,
                'starts_at' => null,
                'ends_at' => null,
                'background_color' => '#ec4899',
                'text_color' => '#ffffff',
                'description' => 'Community appreciation banner',
            ],
            [
                'title' => 'Help Center',
                'type' => 'text',
                'text_content' => 'Need assistance? Our support team is here to help. Visit our knowledge base or contact support.',
                'image_url' => null,
                'external_link' => 'https://example.com/support',
                'is_active' => true,
                'display_order' => 6,
                'starts_at' => null,
                'ends_at' => null,
                'background_color' => '#06b6d4',
                'text_color' => '#ffffff',
                'description' => 'Support and help center banner',
            ],
            [
                'title' => 'Holiday Special',
                'type' => 'text',
                'text_content' => '🎄 Happy Holidays! Enjoy special year-end benefits and thank you for being part of our community.',
                'image_url' => null,
                'external_link' => 'https://example.com/holidays',
                'is_active' => false, // Inactive by default - can be activated when needed
                'display_order' => 7,
                'starts_at' => Carbon::now()->startOfMonth()->addMonths(11), // December
                'ends_at' => Carbon::now()->endOfMonth()->addMonths(11),
                'background_color' => '#dc2626',
                'text_color' => '#ffffff',
                'description' => 'Holiday season promotional banner',
            ],
            [
                'title' => 'Success Stories',
                'type' => 'text',
                'text_content' => 'Read inspiring stories from organizations making a real difference in their communities.',
                'image_url' => null,
                'external_link' => 'https://example.com/success-stories',
                'is_active' => true,
                'display_order' => 8,
                'starts_at' => null,
                'ends_at' => null,
                'background_color' => '#14b8a6',
                'text_color' => '#ffffff',
                'description' => 'Success stories showcase banner',
            ],
        ];

        foreach ($banners as $banner) {
            PromotionalBanner::create($banner);
        }

        $this->command->info('Promotional banners seeded successfully!');
        $this->command->info('Total banners created: ' . count($banners));
        $this->command->info('Active banners: ' . PromotionalBanner::where('is_active', true)->count());
    }
}
