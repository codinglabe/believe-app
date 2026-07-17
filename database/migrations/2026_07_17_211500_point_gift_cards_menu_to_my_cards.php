<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Point mobile-nav Gift Cards at owned cards (manage/redeem), not the purchase marketplace.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('menu_items')) {
            return;
        }

        DB::table('menu_items')
            ->where('menu_key', 'gift_cards')
            ->update([
                'title' => 'Gift Cards',
                'route_name' => 'gift-cards.my-cards',
                'href' => null,
                'icon' => 'Gift',
                'active_path_prefix' => '/gift-cards/my-cards',
                'requires_auth' => true,
                'bottom_nav_eligible' => true,
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        if (! Schema::hasTable('menu_items')) {
            return;
        }

        DB::table('menu_items')
            ->where('menu_key', 'gift_cards')
            ->update([
                'route_name' => 'gift-cards.index',
                'active_path_prefix' => '/gift-cards',
                'requires_auth' => false,
                'updated_at' => now(),
            ]);
    }
};
