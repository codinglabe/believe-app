<?php

namespace Database\Seeders;

use App\Models\MerchantHubMerchant;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class MerchantHubMerchantSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $merchants = [
            ['name' => 'Retail Store', 'slug' => 'retail-store', 'logo_url' => null, 'is_active' => true],
            ['name' => 'Fitness Center', 'slug' => 'fitness-center', 'logo_url' => null, 'is_active' => true],
            ['name' => 'Tech Store', 'slug' => 'tech-store', 'logo_url' => null, 'is_active' => true],
            ['name' => 'Fine Dining Restaurant', 'slug' => 'fine-dining-restaurant', 'logo_url' => null, 'is_active' => true],
            ['name' => 'Luxury Spa', 'slug' => 'luxury-spa', 'logo_url' => null, 'is_active' => true],
            ['name' => 'Cinema Complex', 'slug' => 'cinema-complex', 'logo_url' => null, 'is_active' => true],
        ];

        foreach ($merchants as $merchant) {
            MerchantHubMerchant::updateOrCreate(
                ['slug' => $merchant['slug']],
                $merchant
            );
        }
    }
}
