<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            'Apparel & Accessories',
            'Automotive & Tools',
            'Pet Supplies',
            'Toys & Games',
            'Gifts & Specialty',
            'Arts & Crafts',
            'Sustainable & Ethical Products',
            'Digital Products',
            'Nonprofit / Donations (if applicable)',
            'Electronics & Gadgets',
            'Home & Living',
            'Health & Beauty',
            'Food & Beverage',
            'Baby & Kids',
            'Sports & Outdoors',
            'Books, Media & Education',
            'Office & School Supplies',
        ];

        foreach ($categories as $name) {
            DB::table('categories')->updateOrInsert(
                ['name' => $name], // Match by name
                ['name' => $name, 'created_at' => now(), 'updated_at' => now()]
            );
        }
    }
}
