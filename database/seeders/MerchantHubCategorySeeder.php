<?php

namespace Database\Seeders;

use App\Models\MerchantHubCategory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class MerchantHubCategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = [
            ['name' => 'Gift Cards', 'slug' => 'gift-cards', 'is_active' => true],
            ['name' => 'Services', 'slug' => 'services', 'is_active' => true],
            ['name' => 'Electronics', 'slug' => 'electronics', 'is_active' => true],
            ['name' => 'Dining', 'slug' => 'dining', 'is_active' => true],
            ['name' => 'Entertainment', 'slug' => 'entertainment', 'is_active' => true],
        ];

        foreach ($categories as $category) {
            MerchantHubCategory::updateOrCreate(
                ['slug' => $category['slug']],
                $category
            );
        }
    }
}
