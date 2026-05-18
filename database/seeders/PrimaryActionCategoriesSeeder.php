<?php

namespace Database\Seeders;

use App\Models\PrimaryActionCategory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class PrimaryActionCategoriesSeeder extends Seeder
{
    public function run(): void
    {
        $items = [
            ['name' => 'Housing', 'sort_order' => 10],
            ['name' => 'Food', 'sort_order' => 20],
            ['name' => 'Mental Health', 'sort_order' => 30],
            ['name' => 'Education', 'sort_order' => 40],
            ['name' => 'Faith-Based', 'sort_order' => 50],
            ['name' => 'Jobs', 'sort_order' => 60],
            ['name' => 'Youth', 'sort_order' => 70],
            ['name' => 'Aging', 'sort_order' => 80],
        ];

        foreach ($items as $row) {
            $slug = Str::slug($row['name']);
            PrimaryActionCategory::updateOrCreate(
                ['slug' => $slug],
                [
                    'name' => $row['name'],
                    'sort_order' => $row['sort_order'],
                    'is_active' => true,
                ]
            );
        }
    }
}
