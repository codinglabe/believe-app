<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('menu_items')) {
            return;
        }

        $exists = DB::table('menu_items')->where('menu_key', 'gift_bp')->exists();
        if ($exists) {
            DB::table('menu_items')
                ->where('menu_key', 'gift_bp')
                ->update([
                    'title' => 'Gift BP',
                    'category' => 'give',
                    'route_name' => 'gift-bp.index',
                    'href' => null,
                    'icon' => 'Sparkles',
                    'active_path_prefix' => '/gift-bp',
                    'default_enabled' => true,
                    'requires_auth' => true,
                    'bottom_nav_eligible' => true,
                    'supporter_visible' => true,
                    'org_visible' => true,
                    'admin_visible' => true,
                    'is_active' => true,
                    'sort_order' => 13,
                    'updated_at' => now(),
                ]);

            return;
        }

        DB::table('menu_items')->insert([
            'menu_key' => 'gift_bp',
            'title' => 'Gift BP',
            'category' => 'give',
            'route_name' => 'gift-bp.index',
            'href' => null,
            'icon' => 'Sparkles',
            'active_path_prefix' => '/gift-bp',
            'default_enabled' => true,
            'requires_auth' => true,
            'bottom_nav_eligible' => true,
            'supporter_visible' => true,
            'org_visible' => true,
            'admin_visible' => true,
            'is_active' => true,
            'interest_tags' => json_encode(['gift_cards', 'supporting_organizations', 'community_events']),
            'sort_order' => 13,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        if (! Schema::hasTable('menu_items')) {
            return;
        }

        DB::table('menu_items')->where('menu_key', 'gift_bp')->delete();
    }
};
