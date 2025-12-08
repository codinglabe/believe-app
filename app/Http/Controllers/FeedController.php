<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class FeedController extends Controller
{
    /**
     * Display the feed page.
     */
    public function index(Request $request): Response
    {
        // This will be implemented with the Post model
        // For now, return empty data structure
        $posts = [];
        $nextPageUrl = null;
        $hasMore = false;

        return Inertia::render('feed/index', [
            'posts' => $posts,
            'next_page_url' => $nextPageUrl,
            'has_more' => $hasMore,
        ]);
    }

    /**
     * Store a new post.
     */
    public function store(Request $request)
    {
        $request->validate([
            'content' => 'nullable|string|max:5000',
            'images' => 'nullable|array|max:10',
            'images.*' => 'image|mimes:jpeg,png,jpg,gif|max:5120', // 5MB max per image
        ]);

        // TODO: Implement post creation
        // 1. Create Post model and migration
        // 2. Handle image uploads
        // 3. Store post in database
        // 4. Mark post as seen by current user

        return redirect()->back()->with('success', 'Post created successfully');
    }

    /**
     * Update a post.
     */
    public function update(Request $request, $postId)
    {
        $request->validate([
            'content' => 'nullable|string|max:5000',
            'images' => 'nullable|array|max:10',
            'images.*' => 'image|mimes:jpeg,png,jpg,gif|max:5120',
        ]);

        // TODO: Implement post update
        // 1. Check if user owns the post
        // 2. Update post content/images
        // 3. Mark as edited

        return redirect()->back()->with('success', 'Post updated successfully');
    }

    /**
     * Delete a post.
     */
    public function destroy($postId)
    {
        // TODO: Implement post deletion
        // 1. Check if user owns the post
        // 2. Delete post and associated images
        // 3. Delete reactions and comments

        return redirect()->back()->with('success', 'Post deleted successfully');
    }

    /**
     * Add/update reaction to a post.
     */
    public function react(Request $request, $postId)
    {
        $request->validate([
            'type' => 'required|in:like,love,celebrate,support',
        ]);

        // TODO: Implement reaction
        // 1. Check if user already reacted
        // 2. Update or create reaction
        // 3. Return updated reaction count

        return redirect()->back();
    }

    /**
     * Add a comment to a post.
     */
    public function comment(Request $request, $postId)
    {
        $request->validate([
            'content' => 'required|string|max:1000',
        ]);

        // TODO: Implement comment
        // 1. Create comment
        // 2. Return updated comments

        return redirect()->back();
    }
}

