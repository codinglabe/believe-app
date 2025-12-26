<?php

namespace Database\Seeders;

use App\Models\ServiceCategory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ServiceCategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = [
            [
                'name' => 'Graphics & Design',
                'slug' => 'graphics-design',
                'description' => 'Logo design, brand identity, web design, and more',
                'sort_order' => 1,
            ],
            [
                'name' => 'Programming & Tech',
                'slug' => 'programming-tech',
                'description' => 'Web development, mobile apps, software development',
                'sort_order' => 2,
            ],
            [
                'name' => 'Digital Marketing',
                'slug' => 'digital-marketing',
                'description' => 'SEO, social media marketing, content marketing',
                'sort_order' => 3,
            ],
            [
                'name' => 'Writing & Translation',
                'slug' => 'writing-translation',
                'description' => 'Content writing, translation, copywriting',
                'sort_order' => 4,
            ],
            [
                'name' => 'Video & Animation',
                'slug' => 'video-animation',
                'description' => 'Video editing, animation, motion graphics',
                'sort_order' => 5,
            ],
            [
                'name' => 'Music & Audio',
                'slug' => 'music-audio',
                'description' => 'Voice over, music production, audio editing',
                'sort_order' => 6,
            ],
            [
                'name' => 'Business',
                'slug' => 'business',
                'description' => 'Business consulting, legal, accounting',
                'sort_order' => 7,
            ],
            [
                'name' => 'Lifestyle',
                'slug' => 'lifestyle',
                'description' => 'Personal styling, wellness, fitness coaching',
                'sort_order' => 8,
            ],
        ];

        foreach ($categories as $category) {
            ServiceCategory::updateOrCreate(
                ['slug' => $category['slug']],
                $category
            );
        }
    }
}
