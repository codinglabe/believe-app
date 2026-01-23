<?php

namespace App\Http\Controllers;

use App\Models\Post;
use App\Models\PostReaction;
use App\Models\PostComment;
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
        $posts = Post::with(['user', 'reactions.user'])
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

            return $post;
        });

        if ($request->wantsJson()) {
            return response()->json([
                'posts' => $posts->items(),
                'next_page_url' => $posts->nextPageUrl(),
                'has_more' => $posts->hasMorePages(),
            ]);
        }

        return Inertia::render('frontend/social-feed', [
            'posts' => $posts->items(),
            'next_page_url' => $posts->nextPageUrl(),
            'has_more' => $posts->hasMorePages(),
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
}
