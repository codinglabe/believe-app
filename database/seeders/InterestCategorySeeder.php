<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class InterestCategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Housing',       'slug' => 'housing',       'description' => 'Helping provide safe and affordable housing for those in need.',       'icon' => 'home',        'color' => '#3B82F6', 'sort_order' => 1],
            ['name' => 'Food',          'slug' => 'food',          'description' => 'Fighting hunger and ensuring access to nutritious food for all.',         'icon' => 'apple',       'color' => '#EF4444', 'sort_order' => 2],
            ['name' => 'Education',     'slug' => 'education',     'description' => 'Expanding access to quality education and lifelong learning.',            'icon' => 'book-open',   'color' => '#F59E0B', 'sort_order' => 3],
            ['name' => 'Mental Health', 'slug' => 'mental-health', 'description' => 'Supporting mental wellness, awareness, and access to mental health care.', 'icon' => 'heart',       'color' => '#8B5CF6', 'sort_order' => 4],
            ['name' => 'Faith-Based',   'slug' => 'faith-based',   'description' => 'Connecting faith-driven organizations and communities for social good.',  'icon' => 'star',        'color' => '#6366F1', 'sort_order' => 5],
            ['name' => 'Jobs',          'slug' => 'jobs',          'description' => 'Promoting workforce development and employment opportunities.',            'icon' => 'briefcase',   'color' => '#10B981', 'sort_order' => 6],
            ['name' => 'Youth',         'slug' => 'youth',         'description' => 'Empowering young people through programs, mentorship, and opportunity.',  'icon' => 'users',       'color' => '#F97316', 'sort_order' => 7],
            ['name' => 'Aging',         'slug' => 'aging',         'description' => 'Supporting seniors and elderly populations with dignity and care.',       'icon' => 'user',        'color' => '#64748B', 'sort_order' => 8],
        ];

        foreach ($categories as $category) {
            DB::table('interest_categories')->updateOrInsert(
                ['slug' => $category['slug']],
                array_merge($category, [
                    'is_active'  => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }
    }
}
