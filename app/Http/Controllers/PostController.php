<?php

namespace App\Http\Controllers;

use App\Models\Post;
use App\Models\PostReaction;
use App\Models\PostComment;
use App\Models\Organization;
use App\Models\UserFavoriteOrganization;
use App\Models\UserFollow;
use App\Models\ExcelData;
use App\Models\RewardPointLedger;
use App\Models\User;
use App\Services\ExcelDataTransformer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class PostController extends Controller
{
    /**
     * Display a listing of posts for the feed.
     */
    public function index(Request $request)
    {
        $userId = Auth::id();

        // Get all post IDs that user has seen
        $seenPostIds = DB::table('post_seen')
            ->where('user_id', $userId)
            ->pluck('post_id')
            ->toArray();

        // Get posts with unseen first, then seen posts
        $posts = Post::with(['user.organization', 'reactions.user'])
            ->withCount(['reactions', 'comments'])
            ->when(count($seenPostIds) > 0, function($query) use ($seenPostIds) {
                return $query->orderByRaw('CASE WHEN id IN (' . implode(',', $seenPostIds) . ') THEN 1 ELSE 0 END');
            })
            ->orderBy('created_at', 'DESC')
            ->paginate(10);

        // Load comments (only first 5 per post) and user reactions
        $posts->getCollection()->transform(function ($post) use ($userId, $seenPostIds) {
            $userReaction = $post->reactions()->where('user_id', $userId)->first();
            $post->user_reaction = $userReaction;

            // Load only first 5 comments
            $comments = $post->comments()->with('user')->latest()->limit(5)->get();
            $post->comments = $comments;
            $post->has_more_comments = $post->comments_count > 5;

            // Add creator info (organization if user has org, otherwise user)
            if ($post->user) {
                $post->creator = null;
                $post->creator_type = 'user';
                $post->creator_name = $post->user->name;
                $post->creator_slug = $post->user->slug;
                $post->creator_image = $post->user->image;
                
                // Check if user has an organization
                if ($post->user->role === 'organization' && $post->user->organization) {
                    $org = $post->user->organization;
                    $post->creator = [
                        'id' => $org->id,
                        'name' => $org->name,
                        'slug' => $post->user->slug,
                        'image' => $post->user->image,
                    ];
                    $post->creator_type = 'organization';
                    $post->creator_name = $org->name;
                    $post->creator_slug = $post->user->slug;
                }
            }

            return $post;
        });

        if ($request->wantsJson()) {
            return response()->json([
                'posts' => $posts->items(),
                'next_page_url' => $posts->nextPageUrl(),
                'has_more' => $posts->hasMorePages(),
            ]);
        }

        // Get sidebar data
        $user = Auth::user();
        $peopleYouMayKnow = [];
        $trendingOrganizations = [];
        $userStats = [
            'postsCount' => 0,
            'believePointsBalance' => 0,
            'believePointsEarned' => 0,
            'rewardPointsBalance' => 0,
            'rewardPointsEarned' => 0,
            'followersCount' => 0,
        ];

        if ($user) {
            // Get user stats
            $userStats['postsCount'] = Post::where('user_id', $user->id)->count();
            $userStats['followersCount'] = UserFavoriteOrganization::where('user_id', $user->id)->count();
            
            // Get reward points
            $rewardPointsEarned = RewardPointLedger::where('user_id', $user->id)
                ->where('type', 'credit')
                ->sum('points');
            $rewardPointsSpent = RewardPointLedger::where('user_id', $user->id)
                ->where('type', 'debit')
                ->sum('points');
            $userStats['rewardPointsBalance'] = $rewardPointsEarned - $rewardPointsSpent;
            $userStats['rewardPointsEarned'] = $rewardPointsEarned;

            // Get people you may know (suggested organizations)
            $userFavoriteOrgIds = UserFavoriteOrganization::where('user_id', $user->id)
                ->pluck('organization_id')
                ->toArray();
            
            $suggestedOrgs = Organization::where('registration_status', 'approved')
                ->whereNotIn('id', $userFavoriteOrgIds)
                ->with('user:id,slug,name,image')
                ->limit(4)
                ->get();
            
            if ($suggestedOrgs->isNotEmpty()) {
                $eins = $suggestedOrgs->pluck('ein')->filter()->unique()->toArray();
                $excelDataMap = ExcelData::whereIn('ein', $eins)
                    ->where('status', 'complete')
                    ->orderBy('id', 'desc')
                    ->get()
                    ->groupBy('ein')
                    ->map(function($group) {
                        return $group->first()->id;
                    });
                
                $peopleYouMayKnow = $suggestedOrgs->map(function($org) use ($excelDataMap) {
                    return [
                        'id' => $org->id,
                        'excel_data_id' => $excelDataMap->get($org->ein) ?? null,
                        'slug' => $org->user?->slug ?? null,
                        'name' => $org->name,
                        'org' => $org->description ? \Illuminate\Support\Str::limit($org->description, 30) : 'Organization',
                        'avatar' => $org->user?->image ? Storage::url($org->user->image) : null,
                    ];
                })->toArray();
            }

            // Get trending organizations
            $trendingOrgs = Organization::where('registration_status', 'approved')
                ->withCount('followers')
                ->with('user:id,slug,name')
                ->orderBy('followers_count', 'desc')
                ->limit(4)
                ->get();
            
            if ($trendingOrgs->isNotEmpty()) {
                $eins = $trendingOrgs->pluck('ein')->filter()->unique()->toArray();
                $excelDataMap = ExcelData::whereIn('ein', $eins)
                    ->where('status', 'complete')
                    ->orderBy('id', 'desc')
                    ->get()
                    ->groupBy('ein')
                    ->map(function($group) {
                        return $group->first()->id;
                    });
                
                $colors = ['bg-rose-500', 'bg-cyan-500', 'bg-teal-500', 'bg-blue-500'];
                
                $trendingOrganizations = $trendingOrgs->map(function($org, $index) use ($excelDataMap, $colors) {
                    return [
                        'id' => $org->id,
                        'excel_data_id' => $excelDataMap->get($org->ein) ?? null,
                        'slug' => $org->user?->slug ?? null,
                        'name' => $org->name,
                        'desc' => $org->description ? \Illuminate\Support\Str::limit($org->description, 50) : 'Organization description',
                        'color' => $colors[$index % count($colors)],
                    ];
                })->toArray();
            }
        }

        return Inertia::render('frontend/social-feed', [
            'posts' => $posts->items(),
            'next_page_url' => $posts->nextPageUrl(),
            'has_more' => $posts->hasMorePages(),
            'userStats' => $userStats,
            'peopleYouMayKnow' => $peopleYouMayKnow,
            'trendingOrganizations' => $trendingOrganizations,
        ]);
    }

    /**
     * Store a newly created post.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'content' => 'nullable|string|max:5000',
            'images' => 'nullable|array|max:10',
            'images.*' => 'image|mimes:jpeg,png,jpg,gif,webp|max:2048', // 2MB max per image (to avoid nginx 413 error)
        ]);

        $images = [];
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $image) {
                $path = $image->store('posts', 'public');
                $images[] = Storage::url($path);
            }
        }

        $post = Post::create([
            'user_id' => Auth::id(),
            'content' => $validated['content'] ?? null,
            'images' => $images,
        ]);

        $post->load(['user', 'reactions', 'comments']);

        return response()->json([
            'message' => 'Post created successfully',
            'post' => $post,
        ], 201);
    }

    /**
     * Update the specified post.
     */
    public function update(Request $request, Post $post)
    {
        $this->authorize('update', $post);

        $validated = $request->validate([
            'content' => 'nullable|string|max:5000',
            'images' => 'nullable|array|max:10',
            'images.*' => 'image|mimes:jpeg,png,jpg,gif,webp|max:2048', // 2MB max per image
            'existing_images' => 'nullable|array',
            'existing_images.*' => 'string',
            'images_to_remove' => 'nullable|array',
            'images_to_remove.*' => 'string',
        ]);

        $currentImages = $post->images ?? [];
        $imagesToKeep = $request->input('existing_images', []);
        $imagesToRemove = $request->input('images_to_remove', []);

        // Start with images to keep
        $finalImages = array_intersect($currentImages, $imagesToKeep);

        // Delete removed images
        foreach ($imagesToRemove as $imageUrl) {
            $path = str_replace('/storage/', '', $imageUrl);
            Storage::disk('public')->delete($path);
        }

        // Add new images
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $image) {
                $path = $image->store('posts', 'public');
                $finalImages[] = Storage::url($path);
            }
        }

        // Ensure we don't exceed 10 images
        $finalImages = array_slice($finalImages, 0, 10);

        // Validate: must have either content or images
        $content = trim($validated['content'] ?? '');
        if (empty($content) && empty($finalImages)) {
            return response()->json([
                'message' => 'Post must have either text content or at least one image.',
            ], 422);
        }

        $post->update([
            'content' => !empty($content) ? $content : null,
            'images' => $finalImages,
            'is_edited' => true,
        ]);

        $post->load(['user', 'reactions', 'comments']);

        return response()->json([
            'message' => 'Post updated successfully',
            'post' => $post,
        ]);
    }

    /**
     * Remove the specified post.
     */
    public function destroy(Post $post)
    {
        $this->authorize('delete', $post);

        // Delete associated images
        if ($post->images) {
            foreach ($post->images as $image) {
                $path = str_replace('/storage/', '', $image);
                Storage::disk('public')->delete($path);
            }
        }

        $post->delete();

        return response()->json([
            'message' => 'Post deleted successfully',
        ]);
    }

    /**
     * Add or update reaction to a post.
     */
    public function react(Request $request, Post $post)
    {
        $validated = $request->validate([
            'type' => 'required|in:like,love,care,angry,haha',
        ]);

        $existingReaction = PostReaction::where('post_id', $post->id)
            ->where('user_id', Auth::id())
            ->first();

        if ($existingReaction && $existingReaction->type === $validated['type']) {
            // If same reaction, remove it (toggle off)
            $existingReaction->delete();
            $reaction = null;
        } else {
            // Update or create reaction
            $reaction = PostReaction::updateOrCreate(
                [
                    'post_id' => $post->id,
                    'user_id' => Auth::id(),
                ],
                [
                    'type' => $validated['type'],
                ]
            );
            // Load user relationship
            $reaction->load('user');
        }

        $reactionsCount = $post->reactions()->count();

        return response()->json([
            'message' => 'Reaction updated successfully',
            'reaction' => $reaction ? [
                'id' => $reaction->id,
                'type' => $reaction->type,
                'user_id' => $reaction->user_id,
                'user' => $reaction->user ? [
                    'id' => $reaction->user->id,
                    'name' => $reaction->user->name,
                    'image' => $reaction->user->image,
                ] : null,
            ] : null,
            'reactions_count' => $reactionsCount,
        ]);
    }

    /**
     * Remove reaction from a post.
     */
    public function removeReaction(Post $post)
    {
        PostReaction::where('post_id', $post->id)
            ->where('user_id', Auth::id())
            ->delete();

        return response()->json([
            'message' => 'Reaction removed successfully',
        ]);
    }

    /**
     * Add a comment to a post.
     */
    public function comment(Request $request, Post $post)
    {
        $validated = $request->validate([
            'content' => 'required|string|max:1000',
        ]);

        $comment = PostComment::create([
            'post_id' => $post->id,
            'user_id' => Auth::id(),
            'content' => $validated['content'],
        ]);

        $comment->load('user');

        return response()->json([
            'message' => 'Comment added successfully',
            'comment' => $comment,
        ], 201);
    }

    /**
     * Delete a comment.
     */
    public function deleteComment(PostComment $comment)
    {
        $this->authorize('delete', $comment);

        $comment->delete();

        return response()->json([
            'message' => 'Comment deleted successfully',
        ]);
    }

    /**
     * Get more comments for a post.
     */
    public function getComments(Post $post, Request $request)
    {
        $offset = $request->get('offset', 0);
        $limit = $request->get('limit', 10);

        $comments = $post->comments()
            ->with('user')
            ->latest()
            ->offset($offset)
            ->limit($limit)
            ->get();

        return response()->json([
            'comments' => $comments,
            'has_more' => $post->comments()->count() > ($offset + $limit),
        ]);
    }

    /**
     * Mark a post as seen.
     */
    public function markAsSeen(Post $post)
    {
        $userId = Auth::id();

        \DB::table('post_seen')->updateOrInsert(
            [
                'post_id' => $post->id,
                'user_id' => $userId,
            ],
            [
                'seen_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        return response()->json([
            'message' => 'Post marked as seen',
        ]);
    }

    /**
     * Search for registered organizations and users (supporters)
     * Returns Inertia response with search results (called from searchPage)
     */
    public function search(Request $request)
    {
        // This method is now handled by searchPage directly
        // Redirect to search page with query params
        $searchTerm = trim($request->get('q', ''));
        $type = $request->get('type', 'all');
        
        return redirect()->route('search.index', [
            'q' => $searchTerm,
            'type' => $type
        ]);
    }

    /**
     * Show the search page
     */
    public function searchPage(Request $request)
    {
        $user = Auth::user();
        
        // Get search query from request
        $searchQuery = trim($request->get('q', ''));
        $searchType = $request->get('type', 'all');
        
        // Perform search if query is provided (minimum 1 character)
        $searchResults = ['users' => [], 'organizations' => []];
        if (!empty($searchQuery) && strlen($searchQuery) >= 1) {
            $searchResults = $this->performSearch($searchQuery, $searchType, $user);
        }
        
        // Get sidebar data (same as index)
        $peopleYouMayKnow = [];
        $trendingOrganizations = [];
        $userStats = [
            'postsCount' => 0,
            'believePointsBalance' => 0,
            'believePointsEarned' => 0,
            'rewardPointsBalance' => 0,
            'rewardPointsEarned' => 0,
            'followersCount' => 0,
        ];

        if ($user) {
            // Get user stats
            $userStats['postsCount'] = Post::where('user_id', $user->id)->count();
            $userStats['followersCount'] = UserFavoriteOrganization::where('user_id', $user->id)->count();
            
            // Get reward points
            $rewardPointsEarned = RewardPointLedger::where('user_id', $user->id)
                ->where('type', 'credit')
                ->sum('points');
            $rewardPointsSpent = RewardPointLedger::where('user_id', $user->id)
                ->where('type', 'debit')
                ->sum('points');
            $userStats['rewardPointsBalance'] = $rewardPointsEarned - $rewardPointsSpent;
            $userStats['rewardPointsEarned'] = $rewardPointsEarned;

            // Get people you may know (suggested organizations)
            $userFavoriteOrgIds = UserFavoriteOrganization::where('user_id', $user->id)
                ->pluck('organization_id')
                ->toArray();
            
            $suggestedOrgs = Organization::where('registration_status', 'approved')
                ->whereNotIn('id', $userFavoriteOrgIds)
                ->with('user:id,slug,name,image')
                ->limit(4)
                ->get();
            
            if ($suggestedOrgs->isNotEmpty()) {
                $eins = $suggestedOrgs->pluck('ein')->filter()->unique()->toArray();
                $excelDataMap = ExcelData::whereIn('ein', $eins)
                    ->where('status', 'complete')
                    ->orderBy('id', 'desc')
                    ->get()
                    ->groupBy('ein')
                    ->map(function($group) {
                        return $group->first()->id;
                    });
                
                $peopleYouMayKnow = $suggestedOrgs->map(function($org) use ($excelDataMap) {
                    return [
                        'id' => $org->id,
                        'excel_data_id' => $excelDataMap->get($org->ein) ?? null,
                        'slug' => $org->user?->slug ?? null,
                        'name' => $org->name,
                        'org' => $org->description ? \Illuminate\Support\Str::limit($org->description, 30) : 'Organization',
                        'avatar' => $org->user?->image ? Storage::url($org->user->image) : null,
                    ];
                })->toArray();
            }

            // Get trending organizations
            $trendingOrgs = Organization::where('registration_status', 'approved')
                ->withCount('followers')
                ->with('user:id,slug,name')
                ->orderBy('followers_count', 'desc')
                ->limit(4)
                ->get();
            
            if ($trendingOrgs->isNotEmpty()) {
                $eins = $trendingOrgs->pluck('ein')->filter()->unique()->toArray();
                $excelDataMap = ExcelData::whereIn('ein', $eins)
                    ->where('status', 'complete')
                    ->orderBy('id', 'desc')
                    ->get()
                    ->groupBy('ein')
                    ->map(function($group) {
                        return $group->first()->id;
                    });
                
                $colors = ['bg-rose-500', 'bg-cyan-500', 'bg-teal-500', 'bg-blue-500'];
                
                $trendingOrganizations = $trendingOrgs->map(function($org, $index) use ($excelDataMap, $colors) {
                    return [
                        'id' => $org->id,
                        'excel_data_id' => $excelDataMap->get($org->ein) ?? null,
                        'slug' => $org->user?->slug ?? null,
                        'name' => $org->name,
                        'desc' => $org->description ? \Illuminate\Support\Str::limit($org->description, 50) : 'Organization description',
                        'color' => $colors[$index % count($colors)],
                    ];
                })->toArray();
            }
        }

        return Inertia::render('frontend/search', [
            'userStats' => $userStats,
            'peopleYouMayKnow' => $peopleYouMayKnow,
            'trendingOrganizations' => $trendingOrganizations,
            'searchResults' => $searchResults,
            'searchQuery' => $searchQuery,
            'searchType' => $searchType,
        ]);
    }
    
    /**
     * Perform search and return results (extracted for reuse)
     */
    private function performSearch($searchTerm, $type, $user)
    {
        $results = [
            'users' => [],
            'organizations' => [],
        ];

        // Search users (supporters) - only registered users with 'user' role
        if ($type === 'all' || $type === 'users') {
            $usersQuery = User::whereHas('roles', function ($query) {
                    $query->where('name', 'user');
                })
                ->whereDoesntHave('roles', function ($query) {
                    $query->whereIn('name', ['admin', 'organization', 'organization_pending']);
                })
                ->where(function ($query) use ($searchTerm) {
                    $query->where('name', 'LIKE', '%' . $searchTerm . '%')
                        ->orWhere('email', 'LIKE', '%' . $searchTerm . '%')
                        ->orWhere('slug', 'LIKE', '%' . $searchTerm . '%');
                });

            // Exclude current user if authenticated
            if ($user) {
                $usersQuery->where('id', '!=', $user->id);
            }

            $users = $usersQuery->select('id', 'name', 'email', 'slug', 'image')
                ->limit(20)
                ->get()
                ->map(function ($userResult) use ($user) {
                    // Check if current user is following this user
                    $isFollowing = false;
                    if ($user) {
                        $isFollowing = UserFollow::where('follower_id', $user->id)
                            ->where('following_id', $userResult->id)
                            ->exists();
                    }
                    
                    return [
                        'id' => $userResult->id,
                        'name' => $userResult->name,
                        'email' => $userResult->email,
                        'slug' => $userResult->slug,
                        'image' => $userResult->image ? Storage::url($userResult->image) : null,
                        'is_following' => $isFollowing,
                        'type' => 'user',
                    ];
                });

            $results['users'] = $users;
        }

        // Search registered organizations
        if ($type === 'all' || $type === 'organizations') {
            $organizations = Organization::where('registration_status', 'approved')
                ->where(function ($query) use ($searchTerm) {
                    $query->where('name', 'LIKE', '%' . $searchTerm . '%')
                        ->orWhere('email', 'LIKE', '%' . $searchTerm . '%')
                        ->orWhereHas('user', function ($q) use ($searchTerm) {
                            $q->where('slug', 'LIKE', '%' . $searchTerm . '%')
                              ->orWhere('name', 'LIKE', '%' . $searchTerm . '%');
                        });
                })
                ->with('user:id,slug,name,image')
                ->limit(20)
                ->get()
                ->map(function ($org) use ($user) {
                    // Get excel_data_id for this organization (needed for toggleFavorite)
                    $excelData = ExcelData::where('ein', $org->ein)
                        ->where('status', 'complete')
                        ->orderBy('id', 'desc')
                        ->first();
                    
                    $excelDataId = $excelData ? $excelData->id : null;
                    
                    $isFollowing = false;
                    if ($user) {
                        // Check both organization_id and excel_data_id for following status
                        $isFollowing = UserFavoriteOrganization::where('user_id', $user->id)
                            ->where(function ($query) use ($org, $excelDataId) {
                                $query->where('organization_id', $org->id);
                                if ($excelDataId) {
                                    $query->orWhere('excel_data_id', $excelDataId);
                                }
                            })
                            ->exists();
                    }

                    return [
                        'id' => $org->id,
                        'excel_data_id' => $excelDataId, // Add excel_data_id for toggleFavorite
                        'name' => $org->name,
                        'email' => $org->email,
                        'slug' => $org->user?->slug,
                        'image' => $org->user?->image ? Storage::url($org->user->image) : null,
                        'description' => $org->description ? \Illuminate\Support\Str::limit($org->description, 100) : null,
                        'is_following' => $isFollowing,
                        'type' => 'organization',
                    ];
                });

            $results['organizations'] = $organizations;
        }

        return $results;
    }
}
