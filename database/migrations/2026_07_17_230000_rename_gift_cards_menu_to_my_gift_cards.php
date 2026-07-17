<?php

use App\Models\User;
use App\Models\UserFavoriteMenu;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Put My Gift Cards in Favorites for existing supporters (once).
 * Users can unfavorite or pin it to bottom nav themselves afterward.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('menu_items') || ! Schema::hasTable('user_favorite_menus')) {
            return;
        }

        DB::table('menu_items')
            ->where('menu_key', 'gift_cards')
            ->update([
                'title' => 'My Gift Cards',
                'route_name' => 'gift-cards.my-cards',
                'href' => null,
                'icon' => 'Gift',
                'active_path_prefix' => '/gift-cards/my-cards',
                'requires_auth' => true,
                'bottom_nav_eligible' => true,
                'supporter_visible' => true,
                'updated_at' => now(),
            ]);

        $maxQuick = 8;
        $gridLimit = 6;

        User::query()
            ->where(function ($q) {
                $q->where('role', 'user')
                    ->orWhereHas('roles', fn ($r) => $r->where('name', 'user'));
            })
            ->orderBy('id')
            ->chunkById(200, function ($users) use ($maxQuick, $gridLimit) {
                foreach ($users as $user) {
                    $hasQuick = UserFavoriteMenu::query()
                        ->where('user_id', $user->id)
                        ->where('placement', UserFavoriteMenu::PLACEMENT_QUICK)
                        ->exists();

                    if (! $hasQuick) {
                        continue;
                    }

                    $existing = UserFavoriteMenu::query()
                        ->where('user_id', $user->id)
                        ->where('menu_key', 'gift_cards')
                        ->where('placement', UserFavoriteMenu::PLACEMENT_QUICK)
                        ->first();

                    if ($existing !== null) {
                        if ((int) $existing->sort_order > $gridLimit) {
                            UserFavoriteMenu::query()
                                ->where('user_id', $user->id)
                                ->where('placement', UserFavoriteMenu::PLACEMENT_QUICK)
                                ->where('menu_key', '!=', 'gift_cards')
                                ->where('sort_order', '<', (int) $existing->sort_order)
                                ->increment('sort_order');
                            $existing->update(['sort_order' => 1]);
                        }

                        continue;
                    }

                    $count = UserFavoriteMenu::query()
                        ->where('user_id', $user->id)
                        ->where('placement', UserFavoriteMenu::PLACEMENT_QUICK)
                        ->count();

                    if ($count >= $maxQuick) {
                        UserFavoriteMenu::query()
                            ->where('user_id', $user->id)
                            ->where('placement', UserFavoriteMenu::PLACEMENT_QUICK)
                            ->where('menu_key', '!=', 'gift_cards')
                            ->orderByDesc('sort_order')
                            ->limit(1)
                            ->delete();
                    }

                    UserFavoriteMenu::query()
                        ->where('user_id', $user->id)
                        ->where('placement', UserFavoriteMenu::PLACEMENT_QUICK)
                        ->increment('sort_order');

                    UserFavoriteMenu::query()->create([
                        'user_id' => $user->id,
                        'menu_key' => 'gift_cards',
                        'sort_order' => 1,
                        'placement' => UserFavoriteMenu::PLACEMENT_QUICK,
                        'is_active' => true,
                    ]);
                }
            });
    }

    public function down(): void
    {
        if (! Schema::hasTable('menu_items')) {
            return;
        }

        DB::table('menu_items')
            ->where('menu_key', 'gift_cards')
            ->update([
                'title' => 'Gift Cards',
                'updated_at' => now(),
            ]);
    }
};
