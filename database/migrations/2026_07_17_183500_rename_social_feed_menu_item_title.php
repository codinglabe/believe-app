<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Rename mobile-nav favorite catalog label: Activity Feed → Social Feed.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('menu_items')) {
            return;
        }

        DB::table('menu_items')
            ->where('menu_key', 'social_feed')
            ->update([
                'title' => 'Social Feed',
                'icon' => 'Users',
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        if (! Schema::hasTable('menu_items')) {
            return;
        }

        DB::table('menu_items')
            ->where('menu_key', 'social_feed')
            ->update([
                'title' => 'Activity Feed',
                'icon' => 'Activity',
                'updated_at' => now(),
            ]);
    }
};
