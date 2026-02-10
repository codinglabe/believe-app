<?php

namespace App\Http\Controllers;

use App\Models\CommunityVideoComment;
use App\Models\CommunityVideoLike;
use App\Models\CommunityVideoShare;
use App\Models\CommunityVideoView;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CommunityVideoEngagementController extends Controller
{
    private function resolveOrganizationId(?string $channelSlug): ?int
    {
        if (! $channelSlug) {
            return null;
        }
        $user = User::query()->where('slug', $channelSlug)->first();

        return $user ? Organization::query()->where('user_id', $user->id)->value('id') : null;
    }

    /**
     * Toggle like. Returns updated counts and whether the user has liked.
     */
    public function like(Request $request): JsonResponse
    {
        $request->validate([
            'video_id' => 'required|string|max:64',
            'source' => 'required|string|in:yt,community',
            'channel_slug' => 'nullable|string|max:128',
        ]);

        $user = Auth::user();
        if (! $user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        $videoId = $request->input('video_id');
        $source = $request->input('source');
        $orgId = $this->resolveOrganizationId($request->input('channel_slug'));

        $existing = CommunityVideoLike::query()
            ->where('user_id', $user->id)
            ->where('video_id', $videoId)
            ->where('source', $source)
            ->first();

        if ($existing) {
            $existing->delete();
            $liked = false;
        } else {
            CommunityVideoLike::query()->create([
                'user_id' => $user->id,
                'video_id' => $videoId,
                'source' => $source,
                'organization_id' => $orgId,
            ]);
            $liked = true;
        }

        $appLikes = CommunityVideoLike::query()
            ->where('video_id', $videoId)
            ->where('source', $source)
            ->count();

        return response()->json([
            'liked' => $liked,
            'app_likes' => $appLikes,
        ]);
    }

    /**
     * Record a view (for algorithm). Call when user starts watching.
     */
    public function view(Request $request): JsonResponse
    {
        $request->validate([
            'video_id' => 'required|string|max:64',
            'source' => 'required|string|in:yt,community',
            'channel_slug' => 'nullable|string|max:128',
        ]);

        $user = Auth::user();
        if (! $user) {
            return response()->json(['ok' => true]);
        }

        $videoId = $request->input('video_id');
        $source = $request->input('source');
        $orgId = $this->resolveOrganizationId($request->input('channel_slug'));

        CommunityVideoView::query()->create([
            'user_id' => $user->id,
            'video_id' => $videoId,
            'source' => $source,
            'organization_id' => $orgId,
            'viewed_at' => now(),
        ]);

        return response()->json(['ok' => true]);
    }

    /**
     * Record a share (for algorithm and count).
     */
    public function share(Request $request): JsonResponse
    {
        $request->validate([
            'video_id' => 'required|string|max:64',
            'source' => 'required|string|in:yt,community',
            'channel_slug' => 'nullable|string|max:128',
        ]);

        $user = Auth::user();

        $videoId = $request->input('video_id');
        $source = $request->input('source');
        $orgId = $user ? $this->resolveOrganizationId($request->input('channel_slug')) : null;

        if ($user) {
            CommunityVideoShare::query()->create([
                'user_id' => $user->id,
                'video_id' => $videoId,
                'source' => $source,
                'organization_id' => $orgId,
            ]);
        }

        $appShares = CommunityVideoShare::query()
            ->where('video_id', $videoId)
            ->where('source', $source)
            ->count();

        return response()->json(['app_shares' => $appShares]);
    }

    /**
     * List comments for a video (app comments only; YouTube comments come from API on the page).
     */
    public function comments(Request $request): JsonResponse
    {
        $request->validate([
            'video_id' => 'required|string|max:64',
            'source' => 'required|string|in:yt,community',
        ]);

        $videoId = $request->input('video_id');
        $source = $request->input('source');

        $comments = CommunityVideoComment::query()
            ->where('video_id', $videoId)
            ->where('source', $source)
            ->with('user:id,name,image')
            ->orderByDesc('created_at')
            ->get()
            ->map(function ($c) {
                return [
                    'id' => $c->id,
                    'body' => $c->body,
                    'created_at' => $c->created_at->toIso8601String(),
                    'time_ago' => $c->created_at->diffForHumans(),
                    'user' => [
                        'id' => $c->user->id,
                        'name' => $c->user->name,
                        'avatar' => $c->user->image ? \Illuminate\Support\Facades\Storage::url($c->user->image) : null,
                    ],
                ];
            });

        $count = CommunityVideoComment::query()
            ->where('video_id', $videoId)
            ->where('source', $source)
            ->count();

        return response()->json(['comments' => $comments, 'app_comment_count' => $count]);
    }

    /**
     * Add a comment.
     */
    public function comment(Request $request): JsonResponse
    {
        $request->validate([
            'video_id' => 'required|string|max:64',
            'source' => 'required|string|in:yt,community',
            'body' => 'required|string|max:5000',
            'channel_slug' => 'nullable|string|max:128',
        ]);

        $user = Auth::user();
        if (! $user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        $videoId = $request->input('video_id');
        $source = $request->input('source');
        $orgId = $this->resolveOrganizationId($request->input('channel_slug'));

        $comment = CommunityVideoComment::query()->create([
            'user_id' => $user->id,
            'video_id' => $videoId,
            'source' => $source,
            'body' => $request->input('body'),
            'organization_id' => $orgId,
        ]);

        $comment->load('user:id,name,image');

        $appCommentCount = CommunityVideoComment::query()
            ->where('video_id', $videoId)
            ->where('source', $source)
            ->count();

        return response()->json([
            'comment' => [
                'id' => $comment->id,
                'body' => $comment->body,
                'created_at' => $comment->created_at->toIso8601String(),
                'time_ago' => $comment->created_at->diffForHumans(),
                'user' => [
                    'id' => $comment->user->id,
                    'name' => $comment->user->name,
                    'avatar' => $comment->user->image ? \Illuminate\Support\Facades\Storage::url($comment->user->image) : null,
                ],
            ],
            'app_comment_count' => $appCommentCount,
        ]);
    }
}
