<?php

namespace Database\Seeders;

use App\Models\ChallengeHubCategory;
use App\Models\ChallengeQuizSubcategory;
use Illuminate\Database\Seeder;

class ChallengeQuizSubcategoriesSeeder extends Seeder
{
    /**
     * Seed default quiz subcategory names per hub (taxonomy: challenge_quiz_subcategories).
     * Run after ChallengeHubCategoriesSeeder.
     */
    public function run(): void
    {
        /** @var array<string, list<string>> $bySlug */
        $bySlug = [
            'faith' => ['Scripture', 'Theology', 'Church history', 'Worship & liturgy', 'Ethics & living'],
            'world' => ['Geography', 'Cultures', 'Languages', 'Global affairs', 'Landmarks'],
            'history' => ['Ancient', 'Medieval', 'Modern era', 'U.S. history', 'World wars'],
            'civics' => ['Government', 'Constitution', 'Elections & voting', 'Rights & law', 'Policy'],
            'money' => ['Personal finance', 'Investing', 'Economics', 'Banking', 'Budgeting'],
            'health' => ['Nutrition', 'Fitness', 'Mental health', 'Medicine', 'Prevention'],
            'sports' => ['Olympics', 'Team sports', 'Records & stats', 'Rules & officiating', 'Legends'],
        ];

        foreach ($bySlug as $slug => $names) {
            $hub = ChallengeHubCategory::query()->where('slug', $slug)->first();
            if (! $hub) {
                continue;
            }

            $order = 10;
            foreach ($names as $name) {
                ChallengeQuizSubcategory::query()->updateOrCreate(
                    [
                        'challenge_hub_category_id' => $hub->id,
                        'name' => $name,
                    ],
                    ['sort_order' => $order]
                );
                $order += 10;
            }
        }
    }
}
