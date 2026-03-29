<?php

namespace App\Http\Controllers;

use App\Models\Post;
use App\Models\PostComment;
use App\Models\PostReaction;
use App\Models\PrimaryActionCategory;
use App\Models\User;
use App\Models\UserFavoriteOrganization;
use App\Models\UserFollow;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class FindSupportersController extends Controller
{
    /**
     * Display the Find Supporters page with filters, sort, and pagination.
     */
    public function index(Request $request)
    {
        $currentUser = Auth::user();

        // Show all supporters: any user who is not admin or organization (no role required)
        $query = User::query()
            ->whereDoesntHave('roles', function ($q) {
                $q->whereIn('name', ['admin', 'organization', 'organization_pending']);
            });

        if ($currentUser) {
            $query->where('id', '!=', $currentUser->id);
        }

        // Search (q)
        $search = trim((string) $request->get('q', ''));
        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'LIKE', '%'.$search.'%')
                    ->orWhere('email', 'LIKE', '%'.$search.'%')
                    ->orWhere('slug', 'LIKE', '%'.$search.'%')
                    ->orWhere('city', 'LIKE', '%'.$search.'%')
                    ->orWhere('state', 'LIKE', '%'.$search.'%');
            });
        }

        // Pivot `primary_action_category_user` also has `id`; qualify category PK on joins.
        $pacKey = (new PrimaryActionCategory)->getQualifiedKeyName();

        // Same causes as me: overlap with current user's profile "Supporters Interest"
        // (primary_action_categories — same list as organization primary action / org registration).
        $sameCauses = $request->boolean('same_causes');
        if ($sameCauses && $currentUser) {
            $myCauseIds = $currentUser->supporterInterestCategories()->pluck($pacKey)->toArray();
            if (! empty($myCauseIds)) {
                $query->whereHas('supporterInterestCategories', function ($q) use ($myCauseIds, $pacKey) {
                    $q->whereIn($pacKey, $myCauseIds);
                });
            }
        }

        // Filter by organization cause / supporter interest (primary_action_category ids).
        // Accept `causes` (preferred); legacy `interests` kept for old bookmarks (same shape, new ids).
        $causeIds = $request->input('causes', $request->input('interests', []));
        if (! is_array($causeIds)) {
            $causeIds = array_filter(explode(',', (string) $causeIds));
        }
        $causeIds = array_values(array_unique(array_filter(array_map('intval', $causeIds), fn (int $id) => $id > 0)));
        if (! empty($causeIds)) {
            $allowed = PrimaryActionCategory::query()
                ->where('is_active', true)
                ->whereIn('id', $causeIds)
                ->pluck('id')
                ->all();
            if (! empty($allowed)) {
                $query->whereHas('supporterInterestCategories', function ($q) use ($allowed, $pacKey) {
                    $q->whereIn($pacKey, $allowed);
                });
            }
        }

        $query->with(['supporterInterestCategories' => function ($q) {
            $q->where('is_active', true)->orderBy('sort_order')->orderBy('name');
        }]);

        // Location filter (city or state contains text)
        $location = trim((string) $request->get('location', ''));
        if ($location !== '') {
            $query->where(function ($q) use ($location) {
                $q->where('city', 'LIKE', '%'.$location.'%')
                    ->orWhere('state', 'LIKE', '%'.$location.'%')
                    ->orWhere('zipcode', 'LIKE', '%'.$location.'%');
            });
        }

        $sort = $request->get('sort', 'best_match');

        // Select needed columns including city, state for location display
        $query->select('users.id', 'users.name', 'users.email', 'users.slug', 'users.image', 'users.city', 'users.state', 'users.zipcode', 'users.created_at');

        // Sort
        if ($sort === 'most_active') {
            $query->orderByDesc(
                DB::raw('(SELECT COUNT(*) FROM post_reactions pr INNER JOIN posts p ON p.id = pr.post_id WHERE p.user_id = users.id) + (SELECT COUNT(*) FROM posts WHERE user_id = users.id)')
            );
        } elseif ($sort === 'new_supporters') {
            $query->orderByDesc('users.created_at');
        } else {
            $query->orderBy('users.name');
        }

        $query->with(['supporterInterestCategories' => function ($q) {
            $q->where('is_active', true)->orderBy('sort_order')->orderBy('name');
        }]);

        $paginator = $query->paginate(12)->withQueryString();

        $currentUserFavoriteOrgIds = $currentUser
            ? UserFavoriteOrganization::where('user_id', $currentUser->id)->pluck('organization_id')->toArray()
            : [];

        $supporters = $paginator->through(function ($user) use ($currentUser, $currentUserFavoriteOrgIds) {
            $isFollowing = false;
            if ($currentUser) {
                $isFollowing = UserFollow::where('follower_id', $currentUser->id)
                    ->where('following_id', $user->id)
                    ->exists();
            }

            $causeNames = $user->supporterInterestCategories->pluck('name')->toArray();
            $sharedOrgsCount = 0;
            if ($currentUser && ! empty($currentUserFavoriteOrgIds)) {
                $sharedOrgsCount = UserFavoriteOrganization::where('user_id', $user->id)
                    ->whereIn('organization_id', $currentUserFavoriteOrgIds)
                    ->count();
            }

            $postIds = Post::where('user_id', $user->id)->pluck('id')->toArray();
            $reactionsCount = 0;
            $commentsCount = 0;
            if (! empty($postIds)) {
                $reactionsCount = PostReaction::whereIn('post_id', $postIds)->count();
                $commentsCount = PostComment::whereIn('post_id', $postIds)->count();
            }

            $locationStr = array_filter([$user->city, $user->state, $user->zipcode]);
            $locationDisplay = implode(', ', $locationStr) ?: null;

            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'slug' => $user->slug,
                'image' => $user->image ? Storage::url($user->image) : null,
                'is_following' => $isFollowing,
                'location' => $locationDisplay,
                'interests' => $causeNames,
                'shared_organizations_count' => $sharedOrgsCount,
                'reactions_count' => $reactionsCount,
                'comments_count' => $commentsCount,
                'shares_count' => 0,
            ];
        });

        $interestOptions = PrimaryActionCategory::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn ($row) => ['id' => $row->id, 'name' => $row->name]);

        return Inertia::render('frontend/find-supporters', [
            'seo' => \App\Services\SeoService::forPage('find_supporters'),
            'supporters' => $supporters,
            'searchQuery' => $search,
            'filters' => [
                'same_causes' => $sameCauses,
                'causes' => $causeIds,
                'location' => $location,
                'radius' => $request->get('radius', ''),
                'sort' => $sort,
            ],
            'interestOptions' => $interestOptions,
        ]);
    }
}
