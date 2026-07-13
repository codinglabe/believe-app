<?php

namespace App\Http\Controllers;

use App\Models\SocialMediaAccount;
use App\Models\SocialMediaPost;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;
use Inertia\Response;

class SocialMediaController extends Controller
{
    /**
     * Display the social media management page.
     */
    public function index(): Response
    {
        $user = Auth::user();
        
        $accounts = $user->socialMediaAccounts()
            ->with(['posts' => function ($query) {
                $query->latest()->limit(5);
            }])
            ->get();

        $posts = $user->socialMediaPosts()
            ->with('socialMediaAccounts')
            ->latest()
            ->paginate(10);

        return Inertia::render('SocialMedia/Index', [
            'accounts' => $accounts,
            'posts' => $posts,
            'platforms' => [
                'facebook' => 'Facebook',
                'twitter' => 'Twitter',
                'instagram' => 'Instagram',
                'linkedin' => 'LinkedIn',
                'youtube' => 'YouTube',
                'tiktok' => 'TikTok',
            ],
        ]);
    }

    /**
     * Store a new social media account.
     */
    public function storeAccount(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'platform' => 'required|string|in:facebook,twitter,instagram,linkedin,youtube,tiktok',
            'username' => 'required|string|max:255',
            'display_name' => 'nullable|string|max:255',
            'profile_url' => 'nullable|url|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $account = Auth::user()->socialMediaAccounts()->create($validator->validated());

        return response()->json([
            'message' => 'Social media account connected successfully',
            'account' => $account,
        ]);
    }

    /**
     * Update a social media account.
     */
    public function updateAccount(Request $request, SocialMediaAccount $account): JsonResponse
    {
        $this->authorize('update', $account);

        $validator = Validator::make($request->all(), [
            'platform' => 'required|string|in:facebook,twitter,instagram,linkedin,youtube,tiktok',
            'username' => 'required|string|max:255',
            'display_name' => 'nullable|string|max:255',
            'profile_url' => 'nullable|url|max:500',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $account->update($validator->validated());

        return response()->json([
            'message' => 'Social media account updated successfully',
            'account' => $account,
        ]);
    }

    /**
     * Delete a social media account.
     */
    public function deleteAccount(SocialMediaAccount $account): JsonResponse
    {
        $this->authorize('delete', $account);

        $account->delete();

        return response()->json([
            'message' => 'Social media account deleted successfully',
        ]);
    }

    /**
     * Store a new social media post.
     */
    public function storePost(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'content' => 'required|string|max:280',
            'media_files' => 'nullable|array',
            'media_files.*' => 'string',
            'scheduled_at' => 'nullable|date|after:now',
            'status' => 'required|in:draft,scheduled,published',
            'social_media_account_ids' => 'required|array|min:1',
            'social_media_account_ids.*' => 'exists:social_media_accounts,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        $data['user_id'] = Auth::id();
        
        // If scheduled, set status to scheduled
        if (isset($data['scheduled_at'])) {
            $data['status'] = 'scheduled';
        }

        // Create the post
        $post = SocialMediaPost::create([
            'user_id' => $data['user_id'],
            'content' => $data['content'],
            'media_files' => $data['media_files'] ?? [],
            'status' => $data['status'],
            'scheduled_at' => $data['scheduled_at'] ?? null,
        ]);

        // Attach the selected social media accounts
        $post->socialMediaAccounts()->attach($data['social_media_account_ids']);

        return response()->json([
            'message' => 'Post created successfully and will be published to ' . count($data['social_media_account_ids']) . ' platform(s)',
            'post' => $post->load('socialMediaAccounts'),
        ]);
    }

    /**
     * Update a social media post.
     */
    public function updatePost(Request $request, SocialMediaPost $post): JsonResponse
    {
        $this->authorize('update', $post);

        $validator = Validator::make($request->all(), [
            'content' => 'required|string|max:280',
            'media_files' => 'nullable|array',
            'media_files.*' => 'string',
            'scheduled_at' => 'nullable|date|after:now',
            'status' => 'required|in:draft,scheduled,published',
            'social_media_account_ids' => 'required|array|min:1',
            'social_media_account_ids.*' => 'exists:social_media_accounts,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        
        // If scheduled, set status to scheduled
        if (isset($data['scheduled_at'])) {
            $data['status'] = 'scheduled';
        }

        // Update the post
        $post->update([
            'content' => $data['content'],
            'media_files' => $data['media_files'] ?? [],
            'status' => $data['status'],
            'scheduled_at' => $data['scheduled_at'] ?? null,
        ]);

        // Sync the selected social media accounts
        $post->socialMediaAccounts()->sync($data['social_media_account_ids']);

        return response()->json([
            'message' => 'Post updated successfully and will be published to ' . count($data['social_media_account_ids']) . ' platform(s)',
            'post' => $post->load('socialMediaAccounts'),
        ]);
    }

    /**
     * Delete a social media post.
     */
    public function deletePost(SocialMediaPost $post): JsonResponse
    {
        $this->authorize('delete', $post);

        $post->delete();

        return response()->json([
            'message' => 'Post deleted successfully',
        ]);
    }

    /**
     * Publish a post immediately.
     */
    public function publishPost(SocialMediaPost $post): JsonResponse
    {
        $this->authorize('update', $post);

        if ($post->status === 'published') {
            return response()->json(['message' => 'Post is already published'], 400);
        }

        $post->update([
            'status' => 'published',
            'published_at' => now(),
            'is_published' => true,
        ]);

        return response()->json([
            'message' => 'Post published successfully',
            'post' => $post->load('socialMediaAccount'),
        ]);
    }

    /**
     * Get posts by account.
     */
    public function getPostsByAccount(SocialMediaAccount $account): JsonResponse
    {
        $this->authorize('view', $account);

        $posts = $account->posts()
            ->latest()
            ->paginate(15);

        return response()->json(['posts' => $posts]);
    }

    /**
     * Get post analytics.
     */
    public function getPostAnalytics(SocialMediaPost $post): JsonResponse
    {
        $this->authorize('view', $post);

        return response()->json([
            'analytics' => $post->analytics ?? [],
        ]);
    }
}
