<?php

namespace Database\Seeders\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Persists which seeder classes have completed so `php artisan db:seed` can skip them.
 * Set SEED_FORCE=true in .env to run every seeder regardless.
 */
final class SeederRunTracker
{
    public static function tableExists(): bool
    {
        return Schema::hasTable('seed_runs');
    }

    public static function shouldRun(string $seederClass): bool
    {
        if (self::forceReseed()) {
            return true;
        }

        if (! self::tableExists()) {
            return true;
        }

        return ! DB::table('seed_runs')->where('seeder', $seederClass)->exists();
    }

    public static function markCompleted(string $seederClass): void
    {
        if (! self::tableExists()) {
            return;
        }

        $now = now();

        if (DB::table('seed_runs')->where('seeder', $seederClass)->exists()) {
            DB::table('seed_runs')->where('seeder', $seederClass)->update(['updated_at' => $now]);

            return;
        }

        DB::table('seed_runs')->insert([
            'seeder' => $seederClass,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    public static function forceReseed(): bool
    {
        return filter_var(env('SEED_FORCE', false), FILTER_VALIDATE_BOOL);
    }
}
