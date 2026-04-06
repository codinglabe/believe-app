<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

/**
 * Product categories: parent rows (used on products) + child rows (detail / future use).
 */
class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $tree = [
            'Apparel & Accessories' => [
                'Backpacks', 'Hats', 'Hoodies', 'Jewelry', 'Sunglasses', 'T-Shirts', 'Watches',
            ],
            'Arts & Crafts' => [
                'Canvas Sets', 'DIY Kits', 'Knitting Supplies', 'Paint Kits', 'Resin Kits',
            ],
            'Automotive & Tools' => [
                'Car Accessories', 'Jump Starters', 'Tire Inflators', 'Tool Sets',
            ],
            'Baby & Kids' => [
                'Baby Clothes', 'Baby Monitors', 'Educational Toys', 'Strollers', 'Toys',
            ],
            'Books, Media & Education' => [
                'Audiobooks', 'Books', 'Courses', 'eBooks', 'Study Guides',
            ],
            'Digital Products' => [
                'Courses', 'eBooks', 'Music Downloads', 'Software', 'Templates',
            ],
            'Electronics & Gadgets' => [
                'Adapters', 'Bluetooth Speakers', 'Cables', 'Chargers', 'Gaming Accessories', 'Headphones',
                'Home Security', 'Laptops', 'Power Banks', 'Smart Cameras', 'Smart Doorbell', 'Smart Light',
                'Smart Thermostat', 'Smartphones', 'Smartwatches', 'Streaming Devices', 'Tablets', 'TVs',
                'VR Headsets',
            ],
            'Food & Beverage' => [
                'Burgers', 'Coffee', 'Combo Meals', 'Dairy', 'Fries', 'Fruits', 'Gift Baskets', 'Juice',
                'Meal Kits', 'Meat', 'Organic Food', 'Pizza', 'Protein Bars', 'Snacks', 'Soda', 'Tea',
                'Vegetables', 'Water',
            ],
            'Gifts & Specialty' => [
                'Corporate Gifts', 'Custom Engraving', 'Experience Gifts', 'Gift Boxes', 'Gift Cards',
                'Handmade Items', 'Holiday Gifts', 'Luxury Gifts', 'Personalized Gifts', 'Seasonal Gifts',
                'Souvenirs', 'Subscription Boxes',
            ],
            'Health & Beauty' => [
                'Beauty Blender', 'Cleansers', 'Clippers', 'Conditioner', 'Deodorant', 'Foundation',
                'Fragrances', 'Grooming Kits', 'Hair Dryers', 'Hair Styling', 'Lipstick', 'Makeup Palettes',
                'Moisturizers', 'Oral Care', 'Protein Powder', 'Serums', 'Shampoo', 'Soap', 'Supplements',
                'Vitamins', 'Wellness Kits',
            ],
            'Home & Living' => [
                'Bedding', 'Furniture', 'Home Accents', 'Home Decor', 'Kitchenware',
            ],
            'Nonprofit / Donations' => [
                'Donation', 'Fund a Project', 'Sponsorships',
            ],
            'Office & School Supplies' => [
                'Backpacks', 'Copiers', 'Desk Organizers', 'Desks', 'Fax Machines', 'Filing Cabinets', 'Ink',
                'Label Makers', 'Notebooks', 'Office Chairs', 'Paper', 'Pens', 'Printers', 'Scanners',
                'Shredders', 'Toner',
            ],
            'Pet Supplies' => [
                'Grooming Kits', 'Leashes', 'Pet Beds', 'Pet Food', 'Pet Toys',
            ],
            'Sports & Outdoors' => [
                'Camping Gear', 'Fitness Equipment', 'Yoga Mats',
            ],
            'Sustainable & Ethical Products' => [
                'Bamboo Products', 'Eco Cleaners', 'Reusable Bags',
            ],
            'Toys & Games' => [
                'Action Figures', 'Board Games', 'Card Games', 'Controllers', 'Gaming Headsets',
                'Nintendo Switch', 'PlayStation', 'Puzzles', 'STEM Toys', 'Video Games', 'VR Headsets', 'Xbox',
            ],
        ];

        foreach ($tree as $parentName => $children) {
            $parent = Category::query()->updateOrCreate(
                ['parent_id' => null, 'name' => $parentName],
                ['status' => 'active']
            );

            foreach ($children as $childName) {
                Category::query()->updateOrCreate(
                    ['parent_id' => $parent->id, 'name' => $childName],
                    ['status' => 'active']
                );
            }
        }
    }
}
