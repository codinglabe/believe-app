<?php

namespace Database\Seeders;

use App\Models\FundMeCategory;
use Illuminate\Database\Seeder;

class FundMeCategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Health & Medical', 'slug' => 'health-medical', 'description' => 'Healthcare, medical research, wellness programs', 'sort_order' => 1],
            ['name' => 'Education & Youth', 'slug' => 'education-youth', 'description' => 'Schools, youth development, scholarships', 'sort_order' => 2],
            ['name' => 'Community & Economic Support', 'slug' => 'community-economic', 'description' => 'Local programs, economic mobility, housing', 'sort_order' => 3],
            ['name' => 'Environment & Sustainability', 'slug' => 'environment-sustainability', 'description' => 'Conservation, climate action, green initiatives', 'sort_order' => 4],
            ['name' => 'Human Services & Relief', 'slug' => 'human-services-relief', 'description' => 'Food banks, disaster relief, basic needs', 'sort_order' => 5],
            ['name' => 'Arts, Culture & Heritage', 'slug' => 'arts-culture-heritage', 'description' => 'Arts, museums, cultural preservation', 'sort_order' => 6],
            ['name' => 'International Aid', 'slug' => 'international-aid', 'description' => 'Global development, overseas programs', 'sort_order' => 7],
            ['name' => 'General Operating Support', 'slug' => 'general-operating', 'description' => 'General operating and administrative support', 'sort_order' => 8],
        ];

        foreach ($categories as $cat) {
            FundMeCategory::updateOrCreate(
                ['slug' => $cat['slug']],
                array_merge($cat, ['is_active' => true])
            );
        }
    }
}
