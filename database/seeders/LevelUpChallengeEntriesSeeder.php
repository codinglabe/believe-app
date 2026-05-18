<?php

namespace Database\Seeders;

use App\Models\ChallengeHubCategory;
use App\Models\LevelUpChallengeEntry;
use App\Models\LevelUpTrack;
use Illuminate\Database\Seeder;

/**
 * Demo / baseline rows in `level_up_challenge_entries` for the Faith track.
 *
 * Does not insert into `challenge_questions` — use your existing question bank.
 * Requires {@see ChallengeHubCategoriesSeeder} (and nested ChallengeQuizSubcategoriesSeeder).
 */
class LevelUpChallengeEntriesSeeder extends Seeder
{
    public function run(): void
    {
        $faithHub = ChallengeHubCategory::query()->where('slug', 'faith')->first();
        if (! $faithHub) {
            $this->command?->warn('Faith hub not found. Run ChallengeHubCategoriesSeeder first. Skipping LevelUpChallengeEntriesSeeder.');

            return;
        }

        $track = LevelUpTrack::query()->where('slug', 'faith_level_up')->first();
        if (! $track) {
            $this->command?->warn('faith_level_up track not found. Skipping LevelUpChallengeEntriesSeeder.');

            return;
        }

        $track->update([
            'hub_category_id' => $faithHub->id,
            'subject_categories' => [$faithHub->label],
            'status' => 'active',
            'hub_card_description' => $track->hub_card_description ?? 'Test your knowledge and earn reward points.',
        ]);

        $rows = [
            [
                'subcategory_key' => 'Scripture',
                'title' => 'Scripture',
                'description' => 'Questions drawn from biblical texts and interpretation.',
                'sort_order' => 10,
            ],
            [
                'subcategory_key' => 'Theology',
                'title' => 'Theology',
                'description' => 'Doctrine, creeds, and systematic study.',
                'sort_order' => 20,
            ],
        ];

        foreach ($rows as $row) {
            $entry = LevelUpChallengeEntry::query()->updateOrCreate(
                [
                    'level_up_track_id' => $track->id,
                    'subcategory_key' => $row['subcategory_key'],
                ],
                [
                    'title' => $row['title'],
                    'description' => $row['description'],
                    'sort_order' => $row['sort_order'],
                    'is_active' => true,
                ]
            );

            $nextSlug = LevelUpChallengeEntry::uniqueSlugForTrack($track->id, $entry->title, $entry->id);
            if ($entry->slug !== $nextSlug) {
                $entry->slug = $nextSlug;
                $entry->saveQuietly();
            }
        }

        $this->command?->info('LevelUpChallengeEntriesSeeder: updated faith_level_up and '.count($rows).' challenge entries (slugs synced).');
    }
}
