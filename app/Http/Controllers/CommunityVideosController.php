<?php

namespace App\Http\Controllers;

use App\Models\CommunityVideo;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class CommunityVideosController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->input('search', '');
        $category = $request->input('category', 'all');
        $tab = $request->input('tab', 'latest');

        $query = CommunityVideo::query()
            ->with(['organization:id,name,registered_user_image,user_id', 'organization.user:id,slug,name', 'user:id,name'])
            ->orderByDesc('created_at');

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', '%' . $search . '%')
                    ->orWhere('description', 'like', '%' . $search . '%');
            });
        }

        if ($category !== 'all' && in_array($category, ['events', 'stories', 'impact'], true)) {
            $query->where('category', $category);
        }

        if ($tab === 'trending') {
            $query->orderByDesc('views')->orderByDesc('created_at');
        }
        if ($tab === 'nonprofits') {
            $query->whereNotNull('organization_id');
        }

        $videos = $query->get()->map(fn (CommunityVideo $v) => $this->formatVideo($v));
        $featured = null;

        $featuredQuery = CommunityVideo::query()
            ->with(['organization:id,name,registered_user_image,user_id', 'organization.user:id,slug,name', 'user:id,name']);
        if ($search !== '') {
            $featuredQuery->where(function ($q) use ($search) {
                $q->where('title', 'like', '%' . $search . '%')
                    ->orWhere('description', 'like', '%' . $search . '%');
            });
        }
        if ($category !== 'all' && in_array($category, ['events', 'stories', 'impact'], true)) {
            $featuredQuery->where('category', $category);
        }
        $featuredVideo = $featuredQuery->where('is_featured', true)->first()
            ?? $featuredQuery->orderByDesc('created_at')->first();
        if ($featuredVideo) {
            $featured = $this->formatVideo($featuredVideo, true);
            $videos = $videos->filter(fn ($v) => $v['id'] !== $featuredVideo->id)->values();
        }

        return Inertia::render('frontend/community-videos/Index', [
            'seo' => [
                'title' => 'Community Videos',
                'description' => 'Watch and share inspiring stories and community events from our supporters and nonprofits.',
            ],
            'featuredVideo' => $featured,
            'videos' => $videos,
            'filters' => [
                'search' => $search,
                'category' => $category,
                'tab' => $tab,
            ],
        ]);
    }

    public function upload(Request $request): Response
    {
        return Inertia::render('frontend/community-videos/Upload', [
            'seo' => [
                'title' => 'Upload Video',
                'description' => 'Share your community story or event video.',
            ],
        ]);
    }

    public function channel(Request $request, string $slug): Response
    {
        $user = User::query()
            ->select('id', 'name', 'slug', 'image', 'registered_user_image')
            ->where('slug', $slug)
            ->firstOrFail();

        $organization = Organization::query()
            ->select('id', 'user_id', 'name', 'description', 'mission', 'registered_user_image')
            ->where('user_id', $user->id)
            ->first();

        if ($organization) {
            $channelName = $organization->name;
            $channelDescription = $organization->description ?? $organization->mission;
            $channelAvatar = $organization->registered_user_image
                ? Storage::url($organization->registered_user_image)
                : ($user->image ? Storage::url($user->image) : null);
            $videoQuery = CommunityVideo::query()
                ->with(['organization:id,name,registered_user_image,user_id', 'organization.user:id,slug,name', 'user:id,name'])
                ->where('organization_id', $organization->id)
                ->orderByDesc('created_at');
        } else {
            $channelName = $user->name;
            $channelDescription = null;
            $channelAvatar = $user->image ? Storage::url($user->image) : ($user->registered_user_image ? Storage::url($user->registered_user_image) : null);
            $videoQuery = CommunityVideo::query()
                ->with(['organization:id,name,registered_user_image,user_id', 'organization.user:id,slug,name', 'user:id,name'])
                ->where('user_id', $user->id)
                ->orderByDesc('created_at');
        }

        $collection = $videoQuery->get();
        $videos = $collection->map(fn (CommunityVideo $v) => $this->formatVideo($v));
        $totalVideos = $videos->count();
        $totalViews = $collection->sum('views');

        return Inertia::render('frontend/community-videos/Channel', [
            'seo' => [
                'title' => $channelName . ' - Community Videos',
                'description' => $channelDescription ? \Str::limit($channelDescription, 160) : 'Watch community videos from ' . $channelName,
            ],
            'channel' => [
                'slug' => $slug,
                'name' => $channelName,
                'description' => $channelDescription,
                'avatar' => $channelAvatar,
                'organization_slug' => $organization ? $slug : null,
                'total_videos' => $totalVideos,
                'total_views' => $totalViews,
            ],
            'videos' => $videos,
        ]);
    }

    public function show(Request $request, string $slug): Response
    {
        $video = CommunityVideo::query()
            ->with(['organization:id,name,registered_user_image,user_id', 'organization.user:id,slug,name', 'user:id,name'])
            ->where('slug', $slug)
            ->firstOrFail();

        $video->increment('views');

        $formatted = $this->formatVideo($video, true);

        $relatedQuery = CommunityVideo::query()
            ->with(['organization:id,name,registered_user_image,user_id', 'organization.user:id,slug,name', 'user:id,name'])
            ->where('id', '!=', $video->id)
            ->orderByDesc('created_at');
        if ($video->organization_id) {
            $sameChannel = (clone $relatedQuery)->where('organization_id', $video->organization_id)->limit(20)->get();
        } elseif ($video->user_id) {
            $sameChannel = (clone $relatedQuery)->where('user_id', $video->user_id)->limit(20)->get();
        } else {
            $sameChannel = collect();
        }
        $related = $sameChannel->isNotEmpty()
            ? $sameChannel->map(fn (CommunityVideo $v) => $this->formatVideo($v))
            : $relatedQuery->limit(20)->get()->map(fn (CommunityVideo $v) => $this->formatVideo($v));
        $relatedVideos = $related->values()->all();

        return Inertia::render('frontend/community-videos/Show', [
            'seo' => [
                'title' => $video->title,
                'description' => \Str::limit($video->description, 160),
            ],
            'video' => $formatted,
            'relatedVideos' => $relatedVideos,
        ]);
    }

    private function formatVideo(CommunityVideo $v, bool $full = false): array
    {
        $creatorName = $v->creator_name;
        $thumb = $v->thumbnail_url ?: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=320&q=80';

        $channelSlug = $v->organization?->user?->slug ?? $v->user?->slug ?? null;
        $data = [
            'id' => $v->id,
            'slug' => $v->slug,
            'title' => $v->title,
            'creator' => $creatorName,
            'creatorAvatar' => $v->organization && $v->organization->registered_user_image
                ? Storage::url($v->organization->registered_user_image)
                : null,
            'thumbnail_url' => $thumb,
            'duration' => $v->formatted_duration,
            'views' => $v->views,
            'views_formatted' => number_format($v->views),
            'time_ago' => $v->time_ago,
            'likes' => $v->likes,
            'channel_slug' => $channelSlug,
        ];

        if ($full) {
            $data['description'] = $v->description;
            $data['video_url'] = $v->video_url;
            $data['nonprofit'] = $v->organization ? $v->organization->name : null;
        }

        return $data;
    }
}
