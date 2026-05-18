<?php

namespace Database\Seeders;

use App\Models\ChallengeHubCategory;
use Illuminate\Database\Seeder;

class ChallengeHubCategoriesSeeder extends Seeder
{
    public function run(): void
    {
        $rows = [
            ['slug' => 'faith', 'label' => 'Faith', 'icon' => 'heart', 'filter_key' => 'faith', 'is_new' => false, 'sort_order' => 10],
            ['slug' => 'world', 'label' => 'World', 'icon' => 'globe2', 'filter_key' => 'world', 'is_new' => false, 'sort_order' => 20],
            ['slug' => 'history', 'label' => 'History', 'icon' => 'landmark', 'filter_key' => 'history', 'is_new' => false, 'sort_order' => 30],
            ['slug' => 'civics', 'label' => 'Civics', 'icon' => 'building2', 'filter_key' => 'history', 'is_new' => false, 'sort_order' => 40],
            ['slug' => 'money', 'label' => 'Money', 'icon' => 'dollar_sign', 'filter_key' => 'money', 'is_new' => false, 'sort_order' => 50],
            ['slug' => 'health', 'label' => 'Health', 'icon' => 'activity', 'filter_key' => 'health', 'is_new' => false, 'sort_order' => 60],
            ['slug' => 'sports', 'label' => 'Sports', 'icon' => 'trophy', 'filter_key' => 'sports', 'is_new' => true, 'sort_order' => 70],
        ];

        foreach ($rows as $row) {
            ChallengeHubCategory::query()->updateOrCreate(
                ['slug' => $row['slug']],
                array_merge($row, ['is_active' => true])
            );
        }

        $this->call(ChallengeQuizSubcategoriesSeeder::class);
    }
}
