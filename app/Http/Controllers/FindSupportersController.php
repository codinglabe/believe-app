<?php

namespace App\Http\Controllers;

use App\Models\ChatTopic;
use App\Models\Post;
use App\Models\PostComment;
use App\Models\PostReaction;
use App\Models\User;
use App\Models\UserFavoriteOrganization;
use App\Models\UserFollow;
use App\Services\SeoService;
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
                $q->where('name', 'LIKE', '%' . $search . '%')
                    ->orWhere('email', 'LIKE', '%' . $search . '%')
                    ->orWhere('slug', 'LIKE', '%' . $search . '%')
                    ->orWhere('city', 'LIKE', '%' . $search . '%')
                    ->orWhere('state', 'LIKE', '%' . $search . '%');
            });
        }

        // Same causes as me: users who share at least one interested topic with current user
        $sameCauses = $request->boolean('same_causes');
        if ($sameCauses && $currentUser) {
            $myTopicIds = $currentUser->interestedTopics()->pluck('chat_topics.id')->toArray();
            if (!empty($myTopicIds)) {
                $query->whereHas('interestedTopics', function ($q) use ($myTopicIds) {
                    $q->whereIn('chat_topics.id', $myTopicIds);
                });
            }
        }

        // Filter by selected interests (topic ids)
        $interestIds = $request->input('interests', []);
        if (!is_array($interestIds)) {
            $interestIds = array_filter(explode(',', (string) $interestIds));
        }
        $interestIds = array_map('intval', array_filter($interestIds));
        if (!empty($interestIds)) {
            $query->whereHas('interestedTopics', function ($q) use ($interestIds) {
                $q->whereIn('chat_topics.id', $interestIds);
            });
        }

        // Location filter (city or state contains text)
        $location = trim((string) $request->get('location', ''));
        if ($location !== '') {
            $query->where(function ($q) use ($location) {
                $q->where('city', 'LIKE', '%' . $location . '%')
                    ->orWhere('state', 'LIKE', '%' . $location . '%')
                    ->orWhere('zipcode', 'LIKE', '%' . $location . '%');
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

        $paginator = $query->paginate(12)->withQueryString();

        $currentUserTopicIds = $currentUser ? $currentUser->interestedTopics()->pluck('chat_topics.id')->toArray() : [];
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

            $topicNames = $user->interestedTopics->pluck('name')->toArray();
            $sharedOrgsCount = 0;
            if ($currentUser && !empty($currentUserFavoriteOrgIds)) {
                $sharedOrgsCount = UserFavoriteOrganization::where('user_id', $user->id)
                    ->whereIn('organization_id', $currentUserFavoriteOrgIds)
                    ->count();
            }

            $postIds = Post::where('user_id', $user->id)->pluck('id')->toArray();
            $reactionsCount = 0;
            $commentsCount = 0;
            if (!empty($postIds)) {
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
                'interests' => $topicNames,
                'shared_organizations_count' => $sharedOrgsCount,
                'reactions_count' => $reactionsCount,
                'comments_count' => $commentsCount,
                'shares_count' => 0,
            ];
        });

        $interestOptions = ChatTopic::active()->orderBy('name')->get(['id', 'name'])->map(fn ($t) => ['id' => $t->id, 'name' => $t->name]);

        return Inertia::render('frontend/find-supporters', [
            'seo' => \App\Services\SeoService::forPage('find_supporters'),
            'supporters' => $supporters,
            'searchQuery' => $search,
            'filters' => [
                'same_causes' => $sameCauses,
                'interests' => $interestIds,
                'location' => $location,
                'radius' => $request->get('radius', ''),
                'sort' => $sort,
            ],
            'interestOptions' => $interestOptions,
        ]);
    }
}
