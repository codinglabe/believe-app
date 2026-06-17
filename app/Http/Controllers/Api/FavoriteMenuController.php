<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\FavoriteMenuService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FavoriteMenuController extends Controller
{
    public function __construct(private FavoriteMenuService $favoriteMenuService) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user, 403);

        return response()->json([
            'success' => true,
            'data' => $this->favoriteMenuService->payloadForUser($user),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user, 403);

        $validated = $request->validate([
            'menu_keys' => ['required', 'array', 'max:'.FavoriteMenuService::MAX_QUICK_FAVORITES],
            'menu_keys.*' => ['required', 'string', 'max:64'],
        ]);

        $this->favoriteMenuService->syncQuickFavorites($user, $validated['menu_keys']);

        return response()->json([
            'success' => true,
            'data' => $this->favoriteMenuService->payloadForUser($user),
        ]);
    }

    public function reorder(Request $request): JsonResponse
    {
        return $this->store($request);
    }

    public function syncBottomNav(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user, 403);

        $validated = $request->validate([
            'slots' => ['required', 'array'],
        ]);

        $this->favoriteMenuService->syncBottomNavSlots($user, $validated['slots']);

        return response()->json([
            'success' => true,
            'data' => $this->favoriteMenuService->payloadForUser($user),
        ]);
    }

    public function destroy(Request $request, string $menuKey): JsonResponse
    {
        $user = $request->user();
        abort_unless($user, 403);

        $this->favoriteMenuService->toggleFavorite($user, $menuKey);

        return response()->json([
            'success' => true,
            'data' => $this->favoriteMenuService->payloadForUser($user),
        ]);
    }

    public function menuItems(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user, 403);

        $catalog = $this->favoriteMenuService->visibleCatalogForUser($user);

        return response()->json([
            'success' => true,
            'data' => $catalog->map(fn ($item) => [
                'menuKey' => $item->menu_key,
                'title' => $item->title,
                'category' => $item->category,
                'icon' => $item->icon,
                'href' => $this->favoriteMenuService->resolveHref($item),
            ])->values(),
        ]);
    }
}
