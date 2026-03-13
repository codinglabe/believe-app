<?php

namespace Database\Seeders;

use App\Models\MerchantHubCategory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class MerchantHubCategorySeeder extends Seeder
{
    /**
     * Simple category structure for merchant create offer (v1).
     * Subcategories can be added dynamically later.
     * Asks in terminal when table is not empty: overwrite or skip.
     */
    public function run(): void
    {
        $count = MerchantHubCategory::count();
        $isEmpty = $count === 0;

        if (!$isEmpty) {
            if (php_sapi_name() === 'cli' && defined('STDIN')) {
                echo "\nMerchant hub categories table is not empty ({$count} categories).\n";
                echo "Overwrite with default categories? (yes/no) [no]: ";
                $answer = trim((string) fgets(STDIN));
                if (strtolower($answer) !== 'yes' && strtolower($answer) !== 'y') {
                    echo "Skipping. No changes made.\n";
                    return;
                }
            } elseif (isset($this->command) && $this->command !== null) {
                $overwrite = $this->command->confirm(
                    "Merchant hub categories table is not empty ({$count} categories). Overwrite with default categories?",
                    false
                );
                if (!$overwrite) {
                    $this->command->info('Skipping. No changes made.');
                    return;
                }
            } else {
                return;
            }
            MerchantHubCategory::query()->delete();
        }

        $categories = [
            'Food & Dining',
            'Retail & Shopping',
            'Health & Wellness',
            'Beauty & Personal Care',
            'Professional Services',
            'Home Services',
            'Automotive',
            'Education & Training',
            'Technology Services',
            'Events & Entertainment',
            'Travel & Hospitality',
            'Real Estate',
        ];

        foreach ($categories as $name) {
            $slug = Str::slug($name);
            MerchantHubCategory::updateOrCreate(
                ['slug' => $slug],
                [
                    'name' => $name,
                    'slug' => $slug,
                    'is_active' => true,
                ]
            );
        }

        if ($this->command ?? null) {
            $this->command->info('Merchant hub categories seeded: ' . count($categories) . ' categories.');
        } else {
            echo "Merchant hub categories seeded: " . count($categories) . " categories.\n";
        }
    }
}
