<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class UserController extends Controller
{
    /**
     * Get user profile
     */
    public function getProfile(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'contact_number' => $user->contact_number,
                'dob' => $user->dob,
                'image' => $user->image,
                'cover_img' => $user->cover_img,
                'balance' => $user->balance ?? 0,
                'reward_points' => $user->reward_points ?? 0,
                'believe_points' => $user->believe_points ?? 0,
                'created_at' => $user->created_at,
            ]
        ]);
    }

    /**
     * Update user profile
     */
    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255',
            'contact_number' => 'sometimes|string|max:20',
            'dob' => 'sometimes|date',
            'image' => 'sometimes|image|mimes:jpeg,png,jpg,gif|max:5120', // 5MB max
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $updateData = $request->only(['name', 'contact_number', 'dob']);

        // Handle image upload
        if ($request->hasFile('image')) {
            // Delete old image if exists
            if ($user->image) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($user->image);
            }

            // Store new image
            $filename = 'profile-' . $user->id . '-' . time() . '.' . $request->file('image')->extension();
            $path = $request->file('image')->storeAs('profile-photos', $filename, 'public');
            $updateData['image'] = $path;
        }

        $user->update($updateData);

        return response()->json([
            'success' => true,
            'message' => 'Profile updated successfully',
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'contact_number' => $user->contact_number,
                'dob' => $user->dob,
                'image' => $user->image,
            ]
        ]);
    }

    /**
     * Get user balance
     */
    public function getBalance(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'success' => true,
            'data' => [
                'balance' => $user->balance ?? 0,
                'currency' => 'USD',
            ]
        ]);
    }

    /**
     * Get user points
     */
    public function getPoints(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'success' => true,
            'data' => [
                'reward_points' => $user->reward_points ?? 0,
                'believe_points' => $user->believe_points ?? 0,
            ]
        ]);
    }

    /**
     * Get user's posts for profile
     */
    public function getProfilePosts(Request $request)
    {
        $userId = $request->get('user_id', $request->user()->id);
        $page = $request->get('page', 1);
        $perPage = $request->get('per_page', 10);

        $posts = Post::where('user_id', $userId)
            ->with(['user', 'reactions.user'])
            ->withCount(['reactions', 'comments'])
            ->orderBy('created_at', 'DESC')
            ->paginate($perPage);

        // Load user reactions
        $currentUserId = $request->user()->id;
        $posts->getCollection()->transform(function ($post) use ($currentUserId) {
            $userReaction = $post->reactions()->where('user_id', $currentUserId)->first();
            $post->user_reaction = $userReaction;
            return $post;
        });

        return response()->json([
            'success' => true,
            'data' => [
                'posts' => $posts->items(),
                'pagination' => [
                    'current_page' => $posts->currentPage(),
                    'last_page' => $posts->lastPage(),
                    'per_page' => $posts->perPage(),
                    'total' => $posts->total(),
                ]
            ]
        ]);
    }

    /**
     * Get trending organizations
     */
    public function getTrendingOrganizations(Request $request)
    {
        $limit = $request->get('limit', 4);

        // Get organizations with most donations or followers
        $organizations = Organization::where('registration_status', 'approved')
            ->withCount(['donations', 'users'])
            ->orderBy('donations_count', 'desc')
            ->orderBy('users_count', 'desc')
            ->limit($limit)
            ->get()
            ->map(function ($org) {
                return [
                    'id' => $org->id,
                    'name' => $org->name,
                    'description' => $org->description,
                    'mission' => $org->mission,
                    'ico' => $org->ico,
                    'city' => $org->city,
                    'state' => $org->state,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $organizations
        ]);
    }

    /**
     * Get suggested people to follow
     */
    public function getSuggestedPeople(Request $request)
    {
        $currentUser = $request->user();
        $limit = $request->get('limit', 4);

        // Get users that the current user is not following
        // For now, just get random users (you can improve this with actual follow logic)
        $suggestedUsers = User::where('id', '!=', $currentUser->id)
            ->whereNotNull('name')
            ->inRandomOrder()
            ->limit($limit)
            ->get()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'image' => $user->image,
                    'description' => 'Member of Believe in Unity',
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $suggestedUsers
        ]);
    }

    /**
     * Get suggested causes
     */
    public function getSuggestedCauses(Request $request)
    {
        // Return predefined causes based on NTEE codes or categories
        $causes = [
            [
                'id' => 1,
                'name' => 'Homelessness Support',
                'description' => 'Supporting individuals and families experiencing homelessness',
                'icon' => 'home',
                'color' => 'purple',
            ],
            [
                'id' => 2,
                'name' => 'Mental Health Advocacy',
                'description' => 'Promoting mental wellness and access to mental health services',
                'icon' => 'heart',
                'color' => 'purple',
            ],
            [
                'id' => 3,
                'name' => 'Environmental Advocacy',
                'description' => 'Protecting our environment and promoting sustainability',
                'icon' => 'leaf',
                'color' => 'green',
            ],
            [
                'id' => 4,
                'name' => 'Education & Youth Services',
                'description' => 'Supporting education and youth development programs',
                'icon' => 'book',
                'color' => 'blue',
            ],
            [
                'id' => 5,
                'name' => 'Faith-Based Initiatives',
                'description' => 'Faith-based community support and initiatives',
                'icon' => 'hands',
                'color' => 'purple',
            ],
            [
                'id' => 6,
                'name' => 'Children & Youth',
                'description' => 'Programs and services for children and youth',
                'icon' => 'users',
                'color' => 'blue',
            ],
        ];

        return response()->json([
            'success' => true,
            'data' => $causes
        ]);
    }
}
