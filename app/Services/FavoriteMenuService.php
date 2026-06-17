<?php

namespace App\Services;

use App\Models\MenuItem;
use App\Models\User;
use App\Models\UserFavoriteMenu;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

class FavoriteMenuService
{
    public const MAX_QUICK_FAVORITES = 8;

    public const QUICK_GRID_LIMIT = 6;

    public const MAX_BOTTOM_NAV_CUSTOM_SLOTS = 2;

    /** @var list<string> */
    public const DEFAULT_QUICK_KEYS = [
        'donate',
        'organizations',
        'events',
        'marketplace',
        'merchant_deals',
        'challenge_hub',
        'chat',
        'groups',
    ];

    /** @var array<int, string> */
    public const DEFAULT_BOTTOM_NAV_SLOTS = [
        1 => 'home',
        2 => 'organizations',
        4 => 'chat',
    ];

    /** @var list<string> */
    public const INTEREST_TAG_OPTIONS = [
        'supporting_organizations',
        'volunteering',
        'shopping_deals',
        'gift_cards',
        'faith_ministry',
        'education',
        'community_events',
        'business_networking',
        'companion_hub',
        'content_creation',
    ];

    public function payloadForUser(User $user): array
    {
        $this->ensureDefaults($user);

        $catalog = $this->visibleCatalogForUser($user);
        $favoriteKeys = $this->favoriteKeysForUser($user);
        $quickFavorites = $this->quickFavoritesForUser($user, $catalog);
        $bottomNav = $this->bottomNavForUser($user, $catalog);

        return [
            'favoriteMenuKeys' => $favoriteKeys,
            'quickFavorites' => $quickFavorites,
            'bottomNavSlots' => $bottomNav,
            'menuCatalog' => $this->catalogGrouped($catalog),
            'needsOnboarding' => $user->favorites_onboarding_completed_at === null,
            'interestOptions' => $this->interestOptionsForFrontend(),
            'limits' => [
                'quickMax' => self::MAX_QUICK_FAVORITES,
                'quickGrid' => self::QUICK_GRID_LIMIT,
            ],
        ];
    }

    public function ensureDefaults(User $user): void
    {
        if ($user->role !== 'user') {
            return;
        }

        $hasAny = UserFavoriteMenu::query()->where('user_id', $user->id)->exists();
        if ($hasAny) {
            return;
        }

        $this->seedDefaults($user);
    }

    public function seedDefaults(User $user): void
    {
        DB::transaction(function () use ($user) {
            foreach (self::DEFAULT_QUICK_KEYS as $index => $menuKey) {
                if (! MenuItem::query()->where('menu_key', $menuKey)->exists()) {
                    continue;
                }

                UserFavoriteMenu::query()->create([
                    'user_id' => $user->id,
                    'menu_key' => $menuKey,
                    'sort_order' => $index + 1,
                    'placement' => UserFavoriteMenu::PLACEMENT_QUICK,
                    'is_active' => true,
                ]);
            }

            foreach (self::DEFAULT_BOTTOM_NAV_SLOTS as $slot => $menuKey) {
                if (! MenuItem::query()->where('menu_key', $menuKey)->exists()) {
                    continue;
                }

                UserFavoriteMenu::query()->create([
                    'user_id' => $user->id,
                    'menu_key' => $menuKey,
                    'sort_order' => $slot,
                    'placement' => UserFavoriteMenu::PLACEMENT_BOTTOM_NAV,
                    'bottom_nav_slot' => $slot,
                    'is_active' => true,
                ]);
            }
        });
    }

    /**
     * @param  list<string>  $interests
     */
    public function seedFromInterests(User $user, array $interests): void
    {
        $interests = array_values(array_intersect($interests, self::INTEREST_TAG_OPTIONS));
        if ($interests === []) {
            $this->seedDefaults($user);
            $user->forceFill(['favorites_onboarding_completed_at' => now()])->save();

            return;
        }

        $matchedKeys = MenuItem::query()
            ->where('is_active', true)
            ->where('supporter_visible', true)
            ->get()
            ->filter(function (MenuItem $item) use ($interests) {
                $tags = $item->interest_tags ?? [];
                return count(array_intersect($interests, $tags)) > 0;
            })
            ->sortBy('sort_order')
            ->pluck('menu_key')
            ->unique()
            ->values();

        $quickKeys = $matchedKeys->take(self::MAX_QUICK_FAVORITES);
        if ($quickKeys->isEmpty()) {
            $quickKeys = collect(self::DEFAULT_QUICK_KEYS);
        }

        DB::transaction(function () use ($user, $quickKeys) {
            UserFavoriteMenu::query()->where('user_id', $user->id)->delete();

            foreach ($quickKeys->values() as $index => $menuKey) {
                UserFavoriteMenu::query()->create([
                    'user_id' => $user->id,
                    'menu_key' => $menuKey,
                    'sort_order' => $index + 1,
                    'placement' => UserFavoriteMenu::PLACEMENT_QUICK,
                    'is_active' => true,
                ]);
            }

            $bottomDefaults = self::DEFAULT_BOTTOM_NAV_SLOTS;
            if ($quickKeys->contains('marketplace')) {
                $bottomDefaults[2] = 'marketplace';
            } elseif ($quickKeys->contains('unity_meet')) {
                $bottomDefaults[2] = 'unity_meet';
            }

            foreach ($bottomDefaults as $slot => $menuKey) {
                UserFavoriteMenu::query()->create([
                    'user_id' => $user->id,
                    'menu_key' => $menuKey,
                    'sort_order' => $slot,
                    'placement' => UserFavoriteMenu::PLACEMENT_BOTTOM_NAV,
                    'bottom_nav_slot' => $slot,
                    'is_active' => true,
                ]);
            }

            $user->forceFill(['favorites_onboarding_completed_at' => now()])->save();
        });
    }

    /**
     * @param  list<string>  $menuKeys
     */
    public function syncQuickFavorites(User $user, array $menuKeys): void
    {
        $menuKeys = array_values(array_unique(array_slice($menuKeys, 0, self::MAX_QUICK_FAVORITES)));
        $catalogKeys = $this->visibleCatalogForUser($user)->pluck('menu_key')->all();
        $menuKeys = array_values(array_intersect($menuKeys, $catalogKeys));

        DB::transaction(function () use ($user, $menuKeys) {
            UserFavoriteMenu::query()
                ->where('user_id', $user->id)
                ->where('placement', UserFavoriteMenu::PLACEMENT_QUICK)
                ->delete();

            foreach ($menuKeys as $index => $menuKey) {
                UserFavoriteMenu::query()->create([
                    'user_id' => $user->id,
                    'menu_key' => $menuKey,
                    'sort_order' => $index + 1,
                    'placement' => UserFavoriteMenu::PLACEMENT_QUICK,
                    'is_active' => true,
                ]);
            }
        });
    }

    /**
     * @param  array<int, string>  $slots  e.g. [1 => 'home', 2 => 'marketplace', 4 => 'chat']
     */
    public function syncBottomNavSlots(User $user, array $slots): void
    {
        $allowedSlots = [1, 2, 4];
        $catalog = $this->visibleCatalogForUser($user)->keyBy('menu_key');

        DB::transaction(function () use ($user, $slots, $allowedSlots, $catalog) {
            UserFavoriteMenu::query()
                ->where('user_id', $user->id)
                ->where('placement', UserFavoriteMenu::PLACEMENT_BOTTOM_NAV)
                ->delete();

            foreach ($allowedSlots as $slot) {
                $menuKey = $slots[$slot] ?? self::DEFAULT_BOTTOM_NAV_SLOTS[$slot] ?? 'home';
                $item = $catalog->get($menuKey);
                if (! $item || ! $item->bottom_nav_eligible) {
                    $menuKey = self::DEFAULT_BOTTOM_NAV_SLOTS[$slot] ?? 'home';
                }

                UserFavoriteMenu::query()->create([
                    'user_id' => $user->id,
                    'menu_key' => $menuKey,
                    'sort_order' => $slot,
                    'placement' => UserFavoriteMenu::PLACEMENT_BOTTOM_NAV,
                    'bottom_nav_slot' => $slot,
                    'is_active' => true,
                ]);
            }
        });
    }

    public function toggleFavorite(User $user, string $menuKey): bool
    {
        $existing = UserFavoriteMenu::query()
            ->where('user_id', $user->id)
            ->where('menu_key', $menuKey)
            ->where('placement', UserFavoriteMenu::PLACEMENT_QUICK)
            ->first();

        if ($existing) {
            $existing->delete();

            return false;
        }

        $count = UserFavoriteMenu::query()
            ->where('user_id', $user->id)
            ->where('placement', UserFavoriteMenu::PLACEMENT_QUICK)
            ->count();

        if ($count >= self::MAX_QUICK_FAVORITES) {
            return false;
        }

        if (! $this->visibleCatalogForUser($user)->contains('menu_key', $menuKey)) {
            return false;
        }

        UserFavoriteMenu::query()->create([
            'user_id' => $user->id,
            'menu_key' => $menuKey,
            'sort_order' => $count + 1,
            'placement' => UserFavoriteMenu::PLACEMENT_QUICK,
            'is_active' => true,
        ]);

        return true;
    }

    /**
     * @return list<string>
     */
    public function favoriteKeysForUser(User $user): array
    {
        return UserFavoriteMenu::query()
            ->where('user_id', $user->id)
            ->where('placement', UserFavoriteMenu::PLACEMENT_QUICK)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->pluck('menu_key')
            ->all();
    }

    /**
     * @return Collection<int, MenuItem>
     */
    public function visibleCatalogForUser(User $user): Collection
    {
        $query = MenuItem::query()->where('is_active', true);

        if ($user->role === 'user') {
            $query->where('supporter_visible', true);
        } elseif (in_array($user->role, ['organization', 'organization_pending'], true)) {
            $query->where('org_visible', true);
        } elseif ($user->role === 'admin') {
            $query->where('admin_visible', true);
        }

        return $query->orderBy('sort_order')->get();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function quickFavoritesForUser(User $user, Collection $catalog): array
    {
        $keys = $this->favoriteKeysForUser($user);

        return collect($keys)
            ->map(fn (string $key) => $catalog->firstWhere('menu_key', $key))
            ->filter()
            ->take(self::QUICK_GRID_LIMIT)
            ->map(fn (MenuItem $item) => $this->serializeMenuItem($item))
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function bottomNavForUser(User $user, Collection $catalog): array
    {
        $slots = UserFavoriteMenu::query()
            ->where('user_id', $user->id)
            ->where('placement', UserFavoriteMenu::PLACEMENT_BOTTOM_NAV)
            ->orderBy('bottom_nav_slot')
            ->get()
            ->keyBy('bottom_nav_slot');

        $result = [];
        foreach ([1, 2, 3, 4, 5] as $slot) {
            if ($slot === 3) {
                $result[] = [
                    'slot' => 3,
                    'menuKey' => 'my_favorites',
                    'title' => 'Favorites',
                    'href' => null,
                    'icon' => 'Star',
                    'isHub' => true,
                ];
                continue;
            }

            if ($slot === 5) {
                $profile = $this->resolveProfileItem($user, $catalog);
                $result[] = array_merge($profile, ['slot' => 5]);

                continue;
            }

            $favorite = $slots->get($slot);
            $menuKey = $favorite?->menu_key ?? (self::DEFAULT_BOTTOM_NAV_SLOTS[$slot] ?? 'home');
            $item = $catalog->firstWhere('menu_key', $menuKey);
            if (! $item) {
                $item = $catalog->firstWhere('menu_key', self::DEFAULT_BOTTOM_NAV_SLOTS[$slot] ?? 'home');
            }

            if ($item) {
                $result[] = array_merge($this->serializeMenuItem($item), ['slot' => $slot]);
            }
        }

        return $result;
    }

    /**
     * @return array<string, mixed>
     */
    private function resolveProfileItem(User $user, Collection $catalog): array
    {
        if ($user->role === 'admin' || in_array($user->role, ['organization', 'organization_pending'], true)) {
            return [
                'menuKey' => 'dashboard',
                'title' => 'Profile',
                'href' => route('dashboard'),
                'icon' => 'User',
                'activePathPrefix' => '/dashboard',
            ];
        }

        $profile = $catalog->firstWhere('menu_key', 'profile');

        return $profile
            ? $this->serializeMenuItem($profile)
            : [
                'menuKey' => 'profile',
                'title' => 'Profile',
                'href' => route('user.profile.index'),
                'icon' => 'User',
                'activePathPrefix' => '/profile',
            ];
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeMenuItem(MenuItem $item): array
    {
        return [
            'menuKey' => $item->menu_key,
            'title' => $item->title,
            'href' => $this->resolveHref($item),
            'icon' => $item->icon,
            'category' => $item->category,
            'activePathPrefix' => $item->active_path_prefix,
            'requiresAuth' => $item->requires_auth,
            'bottomNavEligible' => $item->bottom_nav_eligible,
        ];
    }

    /**
     * @return array<string, list<array<string, mixed>>>
     */
    private function catalogGrouped(Collection $catalog): array
    {
        $labels = [
            'home' => 'Home',
            'community' => 'Community',
            'give' => 'Give',
            'earn_save' => 'Earn & Save',
            'media' => 'Media',
            'learning' => 'Learning',
            'tools' => 'Tools',
            'account' => 'Account',
        ];

        $grouped = [];
        foreach ($catalog as $item) {
            $key = $item->category;
            if (! isset($grouped[$key])) {
                $grouped[$key] = [
                    'key' => $key,
                    'label' => $labels[$key] ?? ucfirst(str_replace('_', ' ', $key)),
                    'items' => [],
                ];
            }
            $grouped[$key]['items'][] = $this->serializeMenuItem($item);
        }

        return array_values($grouped);
    }

    /**
     * @return list<array{key: string, label: string}>
     */
    private function interestOptionsForFrontend(): array
    {
        return [
            ['key' => 'supporting_organizations', 'label' => 'Supporting Organizations'],
            ['key' => 'volunteering', 'label' => 'Volunteering'],
            ['key' => 'shopping_deals', 'label' => 'Shopping & Deals'],
            ['key' => 'gift_cards', 'label' => 'Gift Cards'],
            ['key' => 'faith_ministry', 'label' => 'Faith & Ministry'],
            ['key' => 'education', 'label' => 'Education'],
            ['key' => 'community_events', 'label' => 'Community Events'],
            ['key' => 'business_networking', 'label' => 'Business Networking'],
            ['key' => 'companion_hub', 'label' => 'Companion Hub'],
            ['key' => 'content_creation', 'label' => 'Content Creation'],
        ];
    }

    public function resolveHref(MenuItem $item): string
    {
        if ($item->href) {
            return $item->href;
        }

        if ($item->route_name && Route::has($item->route_name)) {
            return route($item->route_name);
        }

        return '#';
    }
}
