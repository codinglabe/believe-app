<?php

namespace Database\Seeders;

use App\Models\BarterBenefitGroup;
use App\Models\BarterCategory;
use App\Models\BarterSubcategory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class BarterCategoriesAndBenefitGroupsSeeder extends Seeder
{
    public function run(): void
    {
        $benefitGroups = [
            'Disabled',
            'Homeless Outreach',
            'Nonprofit',
            'Seniors',
            'Single Parents',
            'Small Business',
            'Veterans',
            'Youth Support',
        ];
        foreach ($benefitGroups as $i => $name) {
            BarterBenefitGroup::updateOrCreate(
                ['slug' => Str::slug($name)],
                ['name' => $name, 'sort_order' => $i + 1]
            );
        }

        $categoriesData = [
            'Home & Daily Living' => ['Cleaning', 'Handyman', 'Lawn Care', 'Moving Help', 'Furniture'],
            'Food & Essentials' => ['Groceries', 'Meal Prep', 'Catering', 'Farm Goods', 'Community Kitchens'],
            'Education & Skills Exchange' => ['Tutoring', 'Mentorship', 'Trade Skills', 'Language Lessons', 'Workshops'],
            'Health, Wellness & Care' => ['Childcare', 'Eldercare', 'Fitness Coaching', 'Mental Wellness', 'Transportation to Appointments'],
            'Technology & Business Support' => ['Web Help', 'Marketing', 'Bookkeeping', 'IT Setup', 'Admin Support'],
            'Goods & Clothing' => ['Clothes', 'Shoes', 'School Supplies', 'Electronics', 'Home Goods'],
            'Transportation & Logistics' => ['Ride Sharing', 'Deliveries', 'Moving Items', 'Vehicle Assistance'],
            'Creative & Media' => ['Photography', 'Video', 'Music', 'Graphic Design', 'Writing'],
            'Community Services' => ['Event Support', 'Outreach', 'Volunteer Coordination', 'Neighborhood Projects'],
            'Economic Empowerment' => ['Micro-Jobs', 'Small Business Help', 'Cooperative Labor', 'Asset Sharing'],
            'Office / Conference / Event Space' => ['Conference Rooms', 'Event Halls', 'Training Rooms', 'Church Spaces', 'Co-Working Desks'],
            'Professional Services' => ['Legal Help', 'Accounting', 'Consulting', 'Notary', 'HR Support'],
        ];

        $catOrder = 0;
        foreach ($categoriesData as $catName => $subNames) {
            $cat = BarterCategory::updateOrCreate(
                ['slug' => Str::slug($catName)],
                ['name' => $catName, 'sort_order' => ++$catOrder]
            );
            foreach ($subNames as $j => $subName) {
                BarterSubcategory::updateOrCreate(
                    ['barter_category_id' => $cat->id, 'slug' => Str::slug($subName)],
                    ['name' => $subName, 'sort_order' => $j + 1]
                );
            }
        }
    }
}
