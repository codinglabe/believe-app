<?php

namespace App\Http\Controllers;

use App\Services\FavoriteMenuService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FavoriteMenuController extends Controller
{
    public function __construct(private FavoriteMenuService $favoriteMenuService) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user, 403);

        return Inertia::render('Favorites/Index', [
            'mobileNav' => $this->favoriteMenuService->payloadForUser($user),
        ]);
    }

    public function syncQuick(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user, 403);
        abort_unless($this->favoriteMenuService->isSupporterUser($user), 403);

        $validated = $request->validate([
            'menu_keys' => ['required', 'array', 'max:'.FavoriteMenuService::MAX_QUICK_FAVORITES],
            'menu_keys.*' => ['required', 'string', 'max:64'],
        ]);

        $this->favoriteMenuService->syncQuickFavorites($user, $validated['menu_keys']);

        return back();
    }

    public function syncBottomNav(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user, 403);
        abort_unless($this->favoriteMenuService->mobileNavRoleKey($user) !== null, 403);

        $validated = $request->validate([
            'slots' => ['required', 'array'],
            'slots.1' => ['nullable', 'string', 'max:64'],
            'slots.2' => ['nullable', 'string', 'max:64'],
            'slots.4' => ['nullable', 'string', 'max:64'],
        ]);

        $slots = [];
        foreach ([1, 2, 4] as $slot) {
            if (! empty($validated['slots'][$slot])) {
                $slots[$slot] = $validated['slots'][$slot];
            }
        }

        $this->favoriteMenuService->syncBottomNavSlots($user, $slots);

        return back();
    }

    public function toggle(Request $request, string $menuKey): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user, 403);
        abort_unless($this->favoriteMenuService->isSupporterUser($user), 403);

        $this->favoriteMenuService->toggleFavorite($user, $menuKey);

        return back();
    }

    public function completeOnboarding(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user, 403);

        $validated = $request->validate([
            'interests' => ['required', 'array', 'min:1'],
            'interests.*' => ['required', 'string', 'max:64'],
        ]);

        $this->favoriteMenuService->seedFromInterests($user, $validated['interests']);

        return back();
    }

    public function skipOnboarding(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user, 403);

        $this->favoriteMenuService->ensureDefaults($user);
        $user->forceFill(['favorites_onboarding_completed_at' => now()])->save();

        return back();
    }
}
