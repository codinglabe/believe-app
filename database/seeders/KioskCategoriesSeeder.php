<?php

namespace Database\Seeders;

use App\Models\KioskCategory;
use Illuminate\Database\Seeder;

class KioskCategoriesSeeder extends Seeder
{
    public function run(): void
    {
        $defaults = [
            ['slug' => 'pay-bills', 'title' => 'Pay Bills', 'keywords' => 'Electricity · Water · Rent', 'sort_order' => 1],
            ['slug' => 'healthcare', 'title' => 'Healthcare', 'keywords' => 'Telehealth & Wellness', 'sort_order' => 2],
            ['slug' => 'government', 'title' => 'Government', 'keywords' => 'Forms · ID · Benefits', 'sort_order' => 3],
            ['slug' => 'find-a-job', 'title' => 'Find a Job', 'keywords' => 'Local Opportunities', 'sort_order' => 4],
            ['slug' => 'financial', 'title' => 'Financial', 'keywords' => 'Banking · Benefits · Loans', 'sort_order' => 5],
            ['slug' => 'community-help', 'title' => 'Community Help', 'keywords' => 'Family · Seniors · Nonprofits', 'sort_order' => 6],
            ['slug' => 'housing-assistance', 'title' => 'Housing Assistance', 'keywords' => 'Rent · Vouchers · Homebuyer', 'sort_order' => 7],
            ['slug' => 'education', 'title' => 'Education', 'keywords' => 'Training · Classes · Students', 'sort_order' => 8],
            ['slug' => 'veteran-services', 'title' => 'Veteran Services', 'keywords' => 'VA · Disability · Jobs', 'sort_order' => 9],
            ['slug' => 'food-and-family', 'title' => 'Food & Family', 'keywords' => 'Food · Childcare · Benefits', 'sort_order' => 10],
            ['slug' => 'transportation', 'title' => 'Transportation', 'keywords' => 'Bus · Medical · Rides', 'sort_order' => 11],
            ['slug' => 'disaster-and-legal', 'title' => 'Disaster & Legal', 'keywords' => 'Relief · Claims · Legal Aid', 'sort_order' => 12],
        ];

        foreach ($defaults as $row) {
            KioskCategory::updateOrCreate(
                ['slug' => $row['slug']],
                [
                    'title' => $row['title'],
                    'keywords' => $row['keywords'],
                    'redirect_url' => null,
                    'sort_order' => $row['sort_order'],
                    'is_active' => true,
                ]
            );
        }
    }
}
