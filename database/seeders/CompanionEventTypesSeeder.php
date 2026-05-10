<?php

namespace Database\Seeders;

use App\Models\EventType;
use Illuminate\Database\Seeder;

/**
 * Idempotent Companion Hub catalog rows (runs once on existing databases where EventTypesTableSeeder is already skipped).
 */
class CompanionEventTypesSeeder extends Seeder
{
    public function run(): void
    {
        $path = __DIR__.'/data/companion_event_types.php';
        if (! is_file($path)) {
            return;
        }

        /** @var array<int, array{name: string, category: string, description: string}> $rows */
        $rows = require $path;

        foreach ($rows as $eventType) {
            EventType::updateOrCreate(
                [
                    'name' => $eventType['name'],
                    'category' => $eventType['category'],
                ],
                [
                    'description' => $eventType['description'],
                    'is_active' => true,
                ]
            );
        }
    }
}
