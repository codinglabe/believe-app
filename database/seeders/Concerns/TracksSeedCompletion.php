<?php

namespace Database\Seeders\Concerns;

use Database\Seeders\Support\SeederRunTracker;

/**
 * Use in seeders invoked via `php artisan db:seed --class=FooSeeder` so they respect
 * the same `seed_runs` table as DatabaseSeeder. Call at the start and end of run().
 *
 * Example:
 *
 *     public function run(): void
 *     {
 *         if ($this->seedAlreadyCompleted()) {
 *             return;
 *         }
 *
 *         // ... seeding logic ...
 *
 *         $this->markSeedCompleted();
 *     }
 */
trait TracksSeedCompletion
{
    protected function seedAlreadyCompleted(): bool
    {
        if (SeederRunTracker::shouldRun(static::class)) {
            return false;
        }

        $this->command?->info('Skipping '.static::class.' (already seeded).');

        return true;
    }

    protected function markSeedCompleted(): void
    {
        SeederRunTracker::markCompleted(static::class);
    }
}
