<?php

namespace Database\Seeders;

use App\Models\MerchantHubOffer;
use App\Models\MerchantHubCategory;
use App\Models\MerchantHubMerchant;
use Illuminate\Database\Seeder;

class MerchantHubOfferSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $giftCards = MerchantHubCategory::where('slug', 'gift-cards')->first();
        $services = MerchantHubCategory::where('slug', 'services')->first();
        $electronics = MerchantHubCategory::where('slug', 'electronics')->first();
        $dining = MerchantHubCategory::where('slug', 'dining')->first();
        $entertainment = MerchantHubCategory::where('slug', 'entertainment')->first();

        $retailStore = MerchantHubMerchant::where('slug', 'retail-store')->first();
        $fitnessCenter = MerchantHubMerchant::where('slug', 'fitness-center')->first();
        $techStore = MerchantHubMerchant::where('slug', 'tech-store')->first();
        $restaurant = MerchantHubMerchant::where('slug', 'fine-dining-restaurant')->first();
        $spa = MerchantHubMerchant::where('slug', 'luxury-spa')->first();
        $cinema = MerchantHubMerchant::where('slug', 'cinema-complex')->first();

        $offers = [
            [
                'merchant_hub_merchant_id' => $retailStore->id,
                'merchant_hub_category_id' => $giftCards->id,
                'title' => 'Gift Card - $50 Value',
                'short_description' => 'Redeem points for a $50 gift card',
                'description' => 'Get a $50 gift card that you can use for any purchase at our retail store. Perfect for yourself or as a gift for someone special.',
                'image_url' => '/placeholder.jpg',
                'points_required' => 5000,
                'cash_required' => 10.00,
                'currency' => 'USD',
                'inventory_qty' => 100,
                'status' => 'active',
            ],
            [
                'merchant_hub_merchant_id' => $fitnessCenter->id,
                'merchant_hub_category_id' => $services->id,
                'title' => 'Fitness Class Pass',
                'short_description' => 'Unlimited classes for one month',
                'description' => 'Get unlimited access to all fitness classes for one full month. Perfect for trying out different workout styles and finding your favorite.',
                'image_url' => '/placeholder.jpg',
                'points_required' => 7500,
                'cash_required' => null,
                'currency' => 'USD',
                'inventory_qty' => 50,
                'status' => 'active',
            ],
            [
                'merchant_hub_merchant_id' => $techStore->id,
                'merchant_hub_category_id' => $electronics->id,
                'title' => 'Wireless Earbuds',
                'short_description' => 'Premium wireless earbuds with noise cancellation',
                'description' => 'High-quality wireless earbuds featuring active noise cancellation, superior sound quality, and long battery life. Perfect for music lovers and commuters.',
                'image_url' => '/placeholder.jpg',
                'points_required' => 10000,
                'cash_required' => 25.00,
                'currency' => 'USD',
                'inventory_qty' => 30,
                'status' => 'active',
            ],
            [
                'merchant_hub_merchant_id' => $restaurant->id,
                'merchant_hub_category_id' => $dining->id,
                'title' => 'Dinner for Two',
                'short_description' => 'Three-course dinner for two people',
                'description' => 'Enjoy a romantic three-course dinner for two at our fine dining restaurant. Includes appetizer, main course, and dessert. Perfect for date night or special occasions.',
                'image_url' => '/placeholder.jpg',
                'points_required' => 8000,
                'cash_required' => 30.00,
                'currency' => 'USD',
                'inventory_qty' => 40,
                'status' => 'active',
            ],
            [
                'merchant_hub_merchant_id' => $spa->id,
                'merchant_hub_category_id' => $services->id,
                'title' => 'Spa Day Package',
                'short_description' => 'Full day spa experience with massage and treatments',
                'description' => 'Treat yourself to a full day spa experience including a relaxing massage, facial treatment, and access to our spa facilities. A perfect way to unwind and recharge.',
                'image_url' => '/placeholder.jpg',
                'points_required' => 12000,
                'cash_required' => 50.00,
                'currency' => 'USD',
                'inventory_qty' => 20,
                'status' => 'active',
            ],
            [
                'merchant_hub_merchant_id' => $cinema->id,
                'merchant_hub_category_id' => $entertainment->id,
                'title' => 'Movie Theater Tickets',
                'short_description' => 'Two tickets to any movie',
                'description' => 'Get two tickets to any movie showing at our cinema complex. Perfect for a night out with friends or family. Valid for any regular screening.',
                'image_url' => '/placeholder.jpg',
                'points_required' => 3000,
                'cash_required' => null,
                'currency' => 'USD',
                'inventory_qty' => 100,
                'status' => 'active',
            ],
        ];

        foreach ($offers as $offer) {
            MerchantHubOffer::updateOrCreate(
                [
                    'merchant_hub_merchant_id' => $offer['merchant_hub_merchant_id'],
                    'title' => $offer['title'],
                ],
                $offer
            );
        }
    }
}
