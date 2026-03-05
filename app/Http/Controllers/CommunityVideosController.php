<?php

namespace App\Http\Controllers;

use App\Models\CommunityVideo;
use App\Models\CommunityVideoComment;
use App\Models\CommunityVideoLike;
use App\Models\CommunityVideoShare;
use App\Models\CommunityVideoView;
use App\Models\Organization;
use App\Models\User;
use App\Services\YouTubeService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class CommunityVideosController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->input('search', '');
        $tab = $request->input('tab', 'latest');
        $org = $request->input('org', 'all');

        try {
            // Organizations with connected YouTube (for Non-Profits tab dropdown)
            $nonprofitOrganizations = Organization::query()
                ->whereNotNull('youtube_channel_url')
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn ($o) => ['id' => $o->id, 'name' => $o->name])
                ->values()
                ->all();

            // Only YouTube videos from connected channels; cache 5 min for fast loads/reloads. On fetch failure, use stale cache if any.
            try {
                $youtubeVideos = Cache::remember('unity_videos_all', 300, fn () => $this->fetchAllYouTubeVideos());
            } catch (\Throwable $e) {
                Log::warning('Unity Videos: fetch failed, using stale cache if available', ['message' => $e->getMessage()]);
                $youtubeVideos = Cache::get('unity_videos_all');
                if (! $youtubeVideos instanceof Collection) {
                    $youtubeVideos = collect();
                }
            }

            if ($search !== '') {
                $searchLower = strtolower($search);
                $youtubeVideos = $youtubeVideos->filter(function ($v) use ($searchLower) {
                    return str_contains(strtolower($v['title']), $searchLower)
                        || str_contains(strtolower($v['creator'] ?? ''), $searchLower);
                })->values();
            }
            // Apply exactly one sort per tab so each tab shows only its intended list
            if ($tab === 'trending') {
                $youtubeVideos = $youtubeVideos->sortByDesc('views')->values();
            } elseif ($tab === 'nonprofits') {
                // Non-Profits tab: only organization channel videos (exclude supporter channels)
                $youtubeVideos = $youtubeVideos->filter(fn ($v) => ! empty($v['organization_id'] ?? null))->sortBy('creator')->values();
                // Optional: filter to a single organization when org param is set
                if ($org !== 'all' && $org !== '' && (int) $org > 0) {
                    $orgId = (int) $org;
                    $youtubeVideos = $youtubeVideos->filter(fn ($v) => (int) ($v['organization_id'] ?? 0) === $orgId)->values();
                }
            } elseif ($tab === 'supporter') {
                // Supporter tab: only supporter (individual user) channel videos (exclude organization channels)
                $youtubeVideos = $youtubeVideos->filter(fn ($v) => empty($v['organization_id'] ?? null))->sortByDesc('sort_at')->values();
            } else {
                $tab = 'latest';
                $youtubeVideos = $youtubeVideos->sortByDesc('sort_at')->values();
            }

            $userId = Auth::id();
            $youtubeVideos = $this->attachEngagementAndRank($youtubeVideos, $userId, $tab);

            // Only full-length videos on this page (exclude Shorts: duration 0:XX or 1:00)
            $isShort = function (array $v): bool {
                $d = $v['duration'] ?? '';
                return is_string($d) && preg_match('/^(?:0:\d{1,2}|1:00)$/', $d);
            };
            $fullLengthOnly = $youtubeVideos->reject($isShort)->values();

            $gridPerPage = 12;
            $page = (int) $request->input('page', 1);
            $totalVideos = $fullLengthOnly->count();
            $featured = null;
            $videos = [];
            if ($totalVideos > 0) {
                if ($page === 1) {
                    $featured = $fullLengthOnly->first();
                    $videos = $fullLengthOnly->slice(1, $gridPerPage)->values()->all();
                } else {
                    $offset = 1 + $gridPerPage * ($page - 1);
                    $videos = $fullLengthOnly->slice($offset, $gridPerPage)->values()->all();
                }
            }
            $hasMore = $totalVideos > 1 + $gridPerPage * $page;
            $nextPage = $page + 1;

            // Shorts are not shown on this page (only real videos)
            $shorts = [];

            $channelBanners = $this->getChannelBannersForIndex();

            // Stats for filter bar (imported videos, livestream replays)
            $livestreamReplays = $fullLengthOnly->filter(fn ($v) => ($v['duration'] ?? '') === 'LIVE')->count();
            $stats = [
                'total_videos' => $totalVideos,
                'livestream_replays' => $livestreamReplays,
            ];

            // Current user's channel: org or supporter (for "Your YouTube Channel" sidebar / Connect CTA)
            $myChannel = null;
            $userOrgHasYoutube = false;
            $userOrgCanConnect = false;
            $userId = Auth::id();
            if ($userId) {
                $org = Organization::query()
                    ->select('id', 'name', 'user_id', 'youtube_channel_url', 'registered_user_image')
                    ->where('user_id', $userId)
                    ->with('user:id,slug')
                    ->first();
                $currentUser = User::query()
                    ->select('id', 'name', 'slug', 'image', 'registered_user_image', 'youtube_channel_url')
                    ->find($userId);

                if ($org) {
                    $userOrgCanConnect = true;
                    if ($org->youtube_channel_url) {
                        $userOrgHasYoutube = true;
                        $youtubeService = app(YouTubeService::class);
                        $details = $youtubeService->getChannelDetails($org->youtube_channel_url);
                        $allPreview = $youtubeService->getChannelVideos($org->youtube_channel_url, 15);
                        $previewVideos = collect($allPreview)->filter(function ($v) {
                            $d = $v['duration'] ?? '';
                            if (! is_string($d) || $d === '' || $d === '0:00') {
                                return false;
                            }
                            return ! preg_match('/^(?:0:\d{1,2}|1:00)$/', $d);
                        })->take(6)->values()->all();
                        $userSlug = $org->user ? $org->user->slug : null;
                        if (! $userSlug && $org->user_id) {
                            $userSlug = User::query()->where('id', $org->user_id)->value('slug');
                        }
                        $myChannel = [
                            'name' => $details['name'] ?? $org->name,
                            'avatar' => $details['avatar_url'] ?? ($org->registered_user_image ? Storage::url($org->registered_user_image) : null),
                            'subscriber_count' => $details['subscriber_count'] ?? 0,
                            'subscriber_count_formatted' => $details['subscriber_count_formatted'] ?? number_format($details['subscriber_count'] ?? 0),
                            'channel_slug' => $userSlug,
                            'preview_videos' => array_map(fn ($v) => [
                                'slug' => $v['id'],
                                'title' => $v['title'],
                                'thumbnail_url' => $v['thumbnail_url'],
                                'duration' => $v['duration'] ?? '',
                            ], $previewVideos),
                        ];
                    }
                } elseif ($currentUser && $currentUser->youtube_channel_url) {
                    // Supporter with connected YouTube channel
                    $userOrgCanConnect = true;
                    $userOrgHasYoutube = true;
                    $youtubeService = app(YouTubeService::class);
                    $details = $youtubeService->getChannelDetails($currentUser->youtube_channel_url);
                    $allPreview = $youtubeService->getChannelVideos($currentUser->youtube_channel_url, 15);
                    $previewVideos = collect($allPreview)->filter(function ($v) {
                        $d = $v['duration'] ?? '';
                        if (! is_string($d) || $d === '' || $d === '0:00') {
                            return false;
                        }
                        return ! preg_match('/^(?:0:\d{1,2}|1:00)$/', $d);
                    })->take(6)->values()->all();
                    $myChannel = [
                        'name' => $details['name'] ?? $currentUser->name,
                        'avatar' => $details['avatar_url'] ?? ($currentUser->registered_user_image ? Storage::url($currentUser->registered_user_image) : ($currentUser->image ? Storage::url($currentUser->image) : null)),
                        'subscriber_count' => $details['subscriber_count'] ?? 0,
                        'subscriber_count_formatted' => $details['subscriber_count_formatted'] ?? number_format($details['subscriber_count'] ?? 0),
                        'channel_slug' => $currentUser->slug,
                        'preview_videos' => array_map(fn ($v) => [
                            'slug' => $v['id'],
                            'title' => $v['title'],
                            'thumbnail_url' => $v['thumbnail_url'],
                            'duration' => $v['duration'] ?? '',
                        ], $previewVideos),
                    ];
                } elseif ($currentUser) {
                    // Supporter without YouTube: show Connect CTA
                    $userOrgCanConnect = true;
                }
            }
        } catch (\Throwable $e) {
            Log::error('Unity Videos index failed', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            $featured = null;
            $videos = [];
            $shorts = [];
            $channelBanners = [];
            $stats = ['total_videos' => 0, 'livestream_replays' => 0];
            $myChannel = null;
            $userOrgHasYoutube = false;
            $userOrgCanConnect = false;
            $hasMore = false;
            $nextPage = 2;
            $nonprofitOrganizations = [];
        }

        // Load-more: return next page as JSON for infinite scroll
        if ($request->wantsJson() && $page > 1) {
            return response()->json([
                'videos' => $videos ?? [],
                'has_more' => $hasMore ?? false,
                'next_page' => $nextPage ?? 2,
            ]);
        }

        return Inertia::render('frontend/community-videos/Index', [
            'seo' => [
                'title' => 'Unity Videos',
                'description' => 'Watch and share inspiring stories and community events from our supporters and nonprofits on Unity Videos.',
            ],
            'channelBanners' => $channelBanners,
            'featuredVideo' => $featured,
            'videos' => $videos,
            'shorts' => $shorts,
            'filters' => [
                'search' => $search,
                'tab' => $tab,
                'org' => $org,
            ],
            'nonprofitOrganizations' => $nonprofitOrganizations ?? [],
            'stats' => $stats ?? ['total_videos' => 0, 'livestream_replays' => 0],
            'videos_has_more' => $hasMore ?? false,
            'videos_next_page' => $nextPage ?? 2,
            'myChannel' => $myChannel ?? null,
            'authUserChannelSlug' => isset($myChannel['channel_slug']) ? $myChannel['channel_slug'] : null,
            'userOrgHasYoutube' => $userOrgHasYoutube ?? false,
            'userOrgCanConnect' => $userOrgCanConnect ?? false,
        ]);
    }

    /**
     * API: Search organizations with YouTube channel (for Non-Profits dropdown).
     */
    public function organizations(Request $request): \Illuminate\Http\JsonResponse
    {
        $search = trim((string) $request->input('search', ''));
        $query = Organization::query()
            ->whereNotNull('youtube_channel_url')
            ->orderBy('name')
            ->limit(50);
        if ($search !== '') {
            $query->where('name', 'like', '%' . $search . '%');
        }
        $data = $query->get(['id', 'name'])->map(fn ($o) => ['id' => $o->id, 'name' => $o->name])->values()->all();
        return response()->json(['data' => $data]);
    }

    /**
     * Get channel banners for the index page slider (slug, name, banner_url).
     * Only includes channels that have a banner image from YouTube.
     *
     * @return array<int, array{slug: string, name: string, banner_url: string}>
     */
    private function getChannelBannersForIndex(): array
    {
        $orgs = Organization::query()
            ->select('id', 'name', 'youtube_channel_url', 'user_id')
            ->whereNotNull('youtube_channel_url')
            ->with('user:id,slug')
            ->get();

        $youtubeService = app(YouTubeService::class);
        $banners = [];
        $orgOwnerIds = $orgs->pluck('user_id')->filter()->all();

        foreach ($orgs as $org) {
            $channelSlug = $org->user?->slug;
            if (! $channelSlug) {
                continue;
            }
            $details = $youtubeService->getChannelDetails($org->youtube_channel_url);
            $bannerUrl = ($details !== null && isset($details['banner_url'])) ? $details['banner_url'] : null;
            if (is_string($bannerUrl) && $bannerUrl !== '') {
                $banners[] = [
                    'slug' => $channelSlug,
                    'name' => $org->name,
                    'banner_url' => $bannerUrl,
                ];
            }
        }

        // Supporters: users with YouTube channel who are not org owners
        $supporters = User::query()
            ->select('id', 'name', 'slug', 'youtube_channel_url')
            ->whereNotNull('youtube_channel_url')
            ->when(! empty($orgOwnerIds), fn ($q) => $q->whereNotIn('id', $orgOwnerIds))
            ->get();

        foreach ($supporters as $supporter) {
            if (! $supporter->slug) {
                continue;
            }
            $details = $youtubeService->getChannelDetails($supporter->youtube_channel_url);
            $bannerUrl = ($details !== null && isset($details['banner_url'])) ? $details['banner_url'] : null;
            if (is_string($bannerUrl) && $bannerUrl !== '') {
                $banners[] = [
                    'slug' => $supporter->slug,
                    'name' => $details['name'] ?? $supporter->name,
                    'banner_url' => $bannerUrl,
                ];
            }
        }

        return $banners;
    }

    /**
     * Warm the Unity Videos index cache (used by scheduler so first visit is fast).
     */
    public function warmUnityVideosCache(): void
    {
        try {
            $videos = $this->fetchAllYouTubeVideos();
            Cache::put('unity_videos_all', $videos, 300);
            Log::info('Unity Videos cache warmed', ['count' => $videos->count()]);
        } catch (\Throwable $e) {
            Log::warning('Unity Videos cache warm failed', ['message' => $e->getMessage()]);
        }
    }

    /**
     * Fetch videos from all organizations that have connected YouTube channels.
     *
     * @return Collection<int, array<string, mixed>>
     */
    private function fetchAllYouTubeVideos(): Collection
    {
        $orgs = Organization::query()
            ->select('id', 'name', 'registered_user_image', 'user_id', 'youtube_channel_url')
            ->whereNotNull('youtube_channel_url')
            ->with('user:id,slug')
            ->get();

        $orgOwnerIds = $orgs->pluck('user_id')->filter()->all();
        $supporters = User::query()
            ->select('id', 'name', 'slug', 'image', 'registered_user_image', 'youtube_channel_url')
            ->whereNotNull('youtube_channel_url')
            ->whereNotNull('slug')
            ->when(! empty($orgOwnerIds), fn ($q) => $q->whereNotIn('id', $orgOwnerIds))
            ->get();

        $youtubeService = app(YouTubeService::class);
        $all = collect();

        foreach ($orgs as $org) {
            $channelVideos = $youtubeService->getChannelVideos($org->youtube_channel_url, 30);
            $channelSlug = $org->user?->slug;
            $creatorAvatar = $org->registered_user_image ? Storage::url($org->registered_user_image) : null;

            foreach ($channelVideos as $yt) {
                $publishedAt = $yt['published_at'] ?? '';
                $sortAt = $publishedAt ? Carbon::parse($publishedAt)->timestamp : 0;
                $timeAgo = $publishedAt ? Carbon::parse($publishedAt)->diffForHumans() : '';

                $all->push([
                    'id' => 'yt-' . $yt['id'],
                    'slug' => $yt['id'],
                    'title' => $yt['title'],
                    'creator' => $org->name,
                    'creatorAvatar' => $creatorAvatar,
                    'thumbnail_url' => $yt['thumbnail_url'],
                    'duration' => $yt['duration'],
                    'views' => $yt['views'],
                    'views_formatted' => $yt['views_formatted'],
                    'time_ago' => $timeAgo,
                    'likes' => $yt['likes'] ?? 0,
                    'likes_formatted' => $yt['likes_formatted'] ?? number_format((int) ($yt['likes'] ?? 0)),
                    'comment_count' => $yt['comment_count'] ?? 0,
                    'comment_count_formatted' => $yt['comment_count_formatted'] ?? number_format((int) ($yt['comment_count'] ?? 0)),
                    'channel_slug' => $channelSlug,
                    'organization_id' => $org->id,
                    'source' => 'youtube',
                    'watch_url' => $yt['watch_url'],
                    'sort_at' => $sortAt,
                ]);
            }

            $liveStreams = $youtubeService->getChannelLiveStreams($org->youtube_channel_url, 10);
            $existingSlugs = $all->pluck('slug')->flip();
            foreach ($liveStreams as $yt) {
                if ($existingSlugs->has($yt['id'])) {
                    continue;
                }
                $publishedAt = $yt['published_at'] ?? '';
                $timeAgo = $publishedAt ? Carbon::parse($publishedAt)->diffForHumans() : '';
                $all->push([
                    'id' => 'yt-' . $yt['id'],
                    'slug' => $yt['id'],
                    'title' => $yt['title'],
                    'creator' => $org->name,
                    'creatorAvatar' => $creatorAvatar,
                    'thumbnail_url' => $yt['thumbnail_url'],
                    'duration' => $yt['duration'],
                    'views' => $yt['views'],
                    'views_formatted' => $yt['views_formatted'],
                    'time_ago' => $timeAgo,
                    'likes' => $yt['likes'] ?? 0,
                    'likes_formatted' => $yt['likes_formatted'] ?? number_format((int) ($yt['likes'] ?? 0)),
                    'comment_count' => $yt['comment_count'] ?? 0,
                    'comment_count_formatted' => $yt['comment_count_formatted'] ?? number_format((int) ($yt['comment_count'] ?? 0)),
                    'channel_slug' => $channelSlug,
                    'organization_id' => $org->id,
                    'source' => 'youtube',
                    'watch_url' => $yt['watch_url'],
                    'sort_at' => PHP_INT_MAX,
                ]);
            }
        }

        foreach ($supporters as $supporter) {
            try {
                $channelSlug = $supporter->slug;
                $creatorAvatar = $supporter->registered_user_image
                    ? Storage::url($supporter->registered_user_image)
                    : ($supporter->image ? Storage::url($supporter->image) : null);
                $youtubeService->getChannelDetails($supporter->youtube_channel_url); // ensure channel is valid
                $creatorName = $supporter->name; // show person name, not channel name

                $channelVideos = $youtubeService->getChannelVideos($supporter->youtube_channel_url, 30);
            } catch (\Throwable $e) {
                Log::warning('Unity Videos: skip supporter channel', ['user_id' => $supporter->id, 'message' => $e->getMessage()]);
                continue;
            }

            foreach ($channelVideos as $yt) {
                $publishedAt = $yt['published_at'] ?? '';
                $sortAt = $publishedAt ? Carbon::parse($publishedAt)->timestamp : 0;
                $timeAgo = $publishedAt ? Carbon::parse($publishedAt)->diffForHumans() : '';

                $all->push([
                    'id' => 'yt-' . $yt['id'],
                    'slug' => $yt['id'],
                    'title' => $yt['title'],
                    'creator' => $creatorName,
                    'creatorAvatar' => $creatorAvatar,
                    'thumbnail_url' => $yt['thumbnail_url'],
                    'duration' => $yt['duration'],
                    'views' => $yt['views'],
                    'views_formatted' => $yt['views_formatted'],
                    'time_ago' => $timeAgo,
                    'likes' => $yt['likes'] ?? 0,
                    'likes_formatted' => $yt['likes_formatted'] ?? number_format((int) ($yt['likes'] ?? 0)),
                    'comment_count' => $yt['comment_count'] ?? 0,
                    'comment_count_formatted' => $yt['comment_count_formatted'] ?? number_format((int) ($yt['comment_count'] ?? 0)),
                    'channel_slug' => $channelSlug,
                    'organization_id' => null,
                    'source' => 'youtube',
                    'watch_url' => $yt['watch_url'],
                    'sort_at' => $sortAt,
                ]);
            }

            try {
                $liveStreams = $youtubeService->getChannelLiveStreams($supporter->youtube_channel_url, 10);
                $existingSlugs = $all->pluck('slug')->flip();
                foreach ($liveStreams as $yt) {
                    if ($existingSlugs->has($yt['id'])) {
                        continue;
                    }
                    $publishedAt = $yt['published_at'] ?? '';
                    $timeAgo = $publishedAt ? Carbon::parse($publishedAt)->diffForHumans() : '';
                    $all->push([
                        'id' => 'yt-' . $yt['id'],
                        'slug' => $yt['id'],
                        'title' => $yt['title'],
                        'creator' => $creatorName,
                        'creatorAvatar' => $creatorAvatar,
                        'thumbnail_url' => $yt['thumbnail_url'],
                        'duration' => $yt['duration'],
                        'views' => $yt['views'],
                        'views_formatted' => $yt['views_formatted'],
                        'time_ago' => $timeAgo,
                        'likes' => $yt['likes'] ?? 0,
                        'likes_formatted' => $yt['likes_formatted'] ?? number_format((int) ($yt['likes'] ?? 0)),
                        'comment_count' => $yt['comment_count'] ?? 0,
                        'comment_count_formatted' => $yt['comment_count_formatted'] ?? number_format((int) ($yt['comment_count'] ?? 0)),
                        'channel_slug' => $channelSlug,
                        'organization_id' => null,
                        'source' => 'youtube',
                        'watch_url' => $yt['watch_url'],
                        'sort_at' => PHP_INT_MAX,
                    ]);
                }
            } catch (\Throwable $e) {
                // Non-fatal: we already have regular videos for this supporter
            }
        }

        return $all->sortByDesc('sort_at')->values();
    }

    /**
     * Attach app engagement counts and user_liked to videos; optionally rank by followed orgs + engagement.
     */
    private function attachEngagementAndRank(Collection $youtubeVideos, ?int $userId, string $tab): Collection
    {
        $videoIds = $youtubeVideos->pluck('slug')->unique()->all();
        if (empty($videoIds)) {
            return $youtubeVideos;
        }

        $appLikes = CommunityVideoLike::query()
            ->where('source', 'yt')
            ->whereIn('video_id', $videoIds)
            ->selectRaw('video_id, count(*) as c')
            ->groupBy('video_id')
            ->pluck('c', 'video_id');

        $appComments = CommunityVideoComment::query()
            ->where('source', 'yt')
            ->whereIn('video_id', $videoIds)
            ->selectRaw('video_id, count(*) as c')
            ->groupBy('video_id')
            ->pluck('c', 'video_id');

        $appShares = CommunityVideoShare::query()
            ->where('source', 'yt')
            ->whereIn('video_id', $videoIds)
            ->selectRaw('video_id, count(*) as c')
            ->groupBy('video_id')
            ->pluck('c', 'video_id');

        $userLikedIds = [];
        $followedOrgIds = [];
        if ($userId) {
            $userLikedIds = CommunityVideoLike::query()
                ->where('user_id', $userId)
                ->where('source', 'yt')
                ->whereIn('video_id', $videoIds)
                ->pluck('video_id')
                ->flip()
                ->all();
            $user = User::query()->find($userId);
            $followedOrgIds = $user ? $user->favoriteOrganizations()->pluck('organizations.id')->flip()->all() : [];
        }

        $out = $youtubeVideos->map(function ($v) use ($appLikes, $appComments, $appShares, $userLikedIds, $followedOrgIds) {
            $vid = (string) ($v['slug'] ?? $v['id'] ?? '');
            $appLike = (int) ($appLikes[$vid] ?? 0);
            $appComment = (int) ($appComments[$vid] ?? 0);
            $appShare = (int) ($appShares[$vid] ?? 0);
            $ytLikes = (int) ($v['likes'] ?? 0);
            $ytComments = (int) ($v['comment_count'] ?? 0);
            $totalLikes = $ytLikes + $appLike;
            $totalComments = $ytComments + $appComment;
            $orgId = $v['organization_id'] ?? null;
            $fromFollowedOrg = $orgId && isset($followedOrgIds[$orgId]);
            $engagementScore = $appLike * 2 + $appComment * 3 + $appShare * 2 + (int) ($v['views'] ?? 0) * 0.001 + ($v['sort_at'] ?? 0) / 1e10;
            $userLiked = isset($userLikedIds[$vid]);

            return array_merge($v, [
                'app_likes' => $appLike,
                'app_comment_count' => $appComment,
                'app_shares' => $appShare,
                'total_likes' => $totalLikes,
                'total_likes_formatted' => number_format($totalLikes),
                'total_comment_count' => $totalComments,
                'total_comment_count_formatted' => number_format($totalComments),
                'user_liked' => $userLiked,
                'from_followed_org' => $fromFollowedOrg,
                'engagement_score' => $engagementScore,
            ]);
        });

        if ($userId) {
            $out = $out->sortByDesc('engagement_score')->sortByDesc('from_followed_org')->values();
        }

        return $out;
    }

    /**
     * Get app engagement (likes, comments, shares, user_liked) and app comments for a single video.
     *
     * @return array{video: array, app_comments: array}
     */
    private function getVideoEngagement(string $videoId, string $source, ?string $channelSlug): array
    {
        $appLikes = CommunityVideoLike::query()
            ->where('video_id', $videoId)
            ->where('source', $source)
            ->count();
        $appCommentCount = CommunityVideoComment::query()
            ->where('video_id', $videoId)
            ->where('source', $source)
            ->count();
        $appShares = CommunityVideoShare::query()
            ->where('video_id', $videoId)
            ->where('source', $source)
            ->count();

        $userId = Auth::id();
        $userLiked = $userId
            ? CommunityVideoLike::query()
                ->where('user_id', $userId)
                ->where('video_id', $videoId)
                ->where('source', $source)
                ->exists()
            : false;

        $appComments = CommunityVideoComment::query()
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
                        'avatar' => $c->user->image ? Storage::url($c->user->image) : null,
                    ],
                ];
            })
            ->all();

        return [
            'video' => [
                'app_likes' => $appLikes,
                'app_comment_count' => $appCommentCount,
                'app_shares' => $appShares,
                'user_liked' => $userLiked,
            ],
            'app_comments' => $appComments,
        ];
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
        $data = $this->getChannelPageData($slug);

        return Inertia::render('frontend/community-videos/Channel', array_merge($data, [
            'seo' => [
                'title' => $data['channel']['name'] . ' - Unity Videos',
                'description' => $data['channel']['description'] ? Str::limit($data['channel']['description'], 160) : 'Watch community videos from ' . $data['channel']['name'],
            ],
        ]));
    }

    /**
     * Return channel page data (channel, videos, youtube_videos) for a given user slug.
     * Used by frontend Channel page and by organization dashboard Integrations/YouTube.
     *
     * @return array{channel: array, videos: array, youtube_videos: array}
     */
    public function getChannelPageData(string $slug): array
    {
        $user = User::query()
            ->select('id', 'name', 'slug', 'image', 'registered_user_image', 'youtube_channel_url')
            ->where('slug', $slug)
            ->firstOrFail();

        $organization = Organization::query()
            ->select('id', 'user_id', 'name', 'description', 'mission', 'registered_user_image', 'youtube_channel_url')
            ->where('user_id', $user->id)
            ->first();

        $channelUrl = $organization?->youtube_channel_url ?? $user->youtube_channel_url;

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
        $totalViews = (int) $collection->sum('views');

        $youtubeVideos = [];
        $channelBannerUrl = null;
        if ($channelUrl) {
            $youtubeService = app(YouTubeService::class);
            $youtubeVideos = $youtubeService->getChannelVideos($channelUrl, 24);
            $liveStreams = $youtubeService->getChannelLiveStreams($channelUrl, 10);
            $existingIds = array_flip(array_column($youtubeVideos, 'id'));
            foreach ($liveStreams as $live) {
                if (! isset($existingIds[$live['id']])) {
                    array_unshift($youtubeVideos, $live);
                    $existingIds[$live['id']] = true;
                }
            }
            // Only show real shorts and videos: exclude items with duration "0:00" or empty (placeholder/invalid).
            $youtubeVideos = array_values(array_filter($youtubeVideos, function ($v) {
                $d = $v['duration'] ?? '';
                return is_string($d) && $d !== '' && $d !== '0:00';
            }));
            $channelDetails = $youtubeService->getChannelDetails($channelUrl);
            if ($channelDetails) {
                $channelBannerUrl = $channelDetails['banner_url'];
                $totalVideos = $channelDetails['video_count'];
                $totalViews = $channelDetails['view_count'];
            } else {
                $totalVideos = $totalVideos + count($youtubeVideos);
                $totalViews = $totalViews + (int) array_sum(array_column($youtubeVideos, 'views'));
            }
        }

        // Shorts: real shorts only — 60 seconds or less but not "0:00" (0:01–0:59 or 1:00)
        $shortsRaw = array_values(array_filter($youtubeVideos, function ($v) {
            $d = $v['duration'] ?? '';
            return is_string($d) && $d !== '0:00' && preg_match('/^(?:0:[1-5]\d|0:0[1-9]|1:00)$/', $d);
        }));
        $shorts = array_map(function ($v) use ($slug, $channelName, $channelAvatar) {
            return [
                'id' => $v['id'],
                'slug' => $v['id'],
                'title' => $v['title'],
                'thumbnail_url' => $v['thumbnail_url'],
                'views' => $v['views'],
                'views_formatted' => $v['views_formatted'],
                'duration' => $v['duration'] ?? '',
                'channel_slug' => $slug,
                'creator' => $channelName,
                'creatorAvatar' => $channelAvatar,
            ];
        }, $shortsRaw);

        $youtubeVideos = $this->attachEngagementToYoutubeVideoList($youtubeVideos, $slug, Auth::id());

        $platformAppLikes = (int) array_sum(array_column($youtubeVideos, 'app_likes'));
        $platformAppComments = (int) array_sum(array_column($youtubeVideos, 'app_comment_count'));
        $platformAppShares = (int) array_sum(array_column($youtubeVideos, 'app_shares'));
        $platformAppViews = 0;
        if ($organization) {
            $platformAppViews = CommunityVideoView::query()
                ->where('organization_id', $organization->id)
                ->where('source', 'yt')
                ->count();
        }

        return [
            'channel' => [
                'slug' => $slug,
                'name' => $channelName,
                'description' => $channelDescription,
                'avatar' => $channelAvatar,
                'banner_url' => $channelBannerUrl,
                'organization_slug' => $organization ? $slug : null,
                'youtube_channel_url' => $channelUrl,
                'total_videos' => $totalVideos,
                'total_views' => $totalViews,
                'platform_app_likes' => $platformAppLikes,
                'platform_app_comments' => $platformAppComments,
                'platform_app_shares' => $platformAppShares,
                'platform_app_views' => $platformAppViews,
            ],
            'videos' => $videos->values()->all(),
            'youtube_videos' => $youtubeVideos,
            'shorts' => $shorts,
        ];
    }

    /**
     * Attach app engagement (likes, comments, shares, user_liked) and total counts to a list of YouTube videos.
     *
     * @param  array<int, array<string, mixed>>  $youtubeVideos
     * @return array<int, array<string, mixed>>
     */
    private function attachEngagementToYoutubeVideoList(array $youtubeVideos, string $channelSlug, ?int $userId): array
    {
        if (empty($youtubeVideos)) {
            return $youtubeVideos;
        }
        $videoIds = array_column($youtubeVideos, 'id');
        $appLikes = CommunityVideoLike::query()
            ->where('source', 'yt')
            ->whereIn('video_id', $videoIds)
            ->selectRaw('video_id, count(*) as c')
            ->groupBy('video_id')
            ->pluck('c', 'video_id');
        $appComments = CommunityVideoComment::query()
            ->where('source', 'yt')
            ->whereIn('video_id', $videoIds)
            ->selectRaw('video_id, count(*) as c')
            ->groupBy('video_id')
            ->pluck('c', 'video_id');
        $appShares = CommunityVideoShare::query()
            ->where('source', 'yt')
            ->whereIn('video_id', $videoIds)
            ->selectRaw('video_id, count(*) as c')
            ->groupBy('video_id')
            ->pluck('c', 'video_id');
        $userLikedIds = [];
        if ($userId) {
            $likedRows = CommunityVideoLike::query()
                ->where('user_id', $userId)
                ->where('source', 'yt')
                ->whereIn('video_id', $videoIds)
                ->pluck('video_id');
            $userLikedIds = array_fill_keys($likedRows->map(fn ($id) => (string) $id)->all(), true);
        }
        $out = [];
        foreach ($youtubeVideos as $v) {
            $vid = (string) ($v['id'] ?? '');
            $appLike = (int) ($appLikes[$vid] ?? 0);
            $appComment = (int) ($appComments[$vid] ?? 0);
            $appShare = (int) ($appShares[$vid] ?? 0);
            $ytLikes = (int) ($v['likes'] ?? 0);
            $ytComments = (int) ($v['comment_count'] ?? 0);
            $userLiked = isset($userLikedIds[$vid]);
            $out[] = array_merge($v, [
                'app_likes' => $appLike,
                'app_comment_count' => $appComment,
                'app_shares' => $appShare,
                'total_likes_formatted' => number_format($ytLikes + $appLike),
                'total_comment_count_formatted' => number_format($ytComments + $appComment),
                'user_liked' => $userLiked,
            ]);
        }
        return $out;
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
                'description' => Str::limit($video->description, 160),
            ],
            'video' => $formatted,
            'relatedVideos' => $relatedVideos,
        ]);
    }

    /**
     * Watch page for YouTube videos: embed player on site (no redirect to YouTube).
     * When the YouTube API is unavailable, still render the page with embed (uses id + query params).
     */
    public function showYouTube(Request $request, string $id): Response
    {
        $details = app(YouTubeService::class)->getVideoDetails($id);
        $channelSlug = $request->query('channel_slug');
        $creator = $request->query('creator', '');
        $creatorAvatar = $request->query('creator_avatar');

        if ($details) {
            $creator = $creator ?: $details['channel_title'];
            $video = [
                'id' => $details['id'],
                'slug' => $details['id'],
                'title' => $details['title'],
                'description' => $details['description'],
                'creator' => $creator,
                'creatorAvatar' => $creatorAvatar ?: null,
                'thumbnail_url' => $details['thumbnail_url'],
                'duration' => $details['duration'],
                'views' => $details['views'],
                'views_formatted' => $details['views_formatted'],
                'time_ago' => $details['time_ago'],
                'likes' => $details['likes'] ?? 0,
                'likes_formatted' => $details['likes_formatted'] ?? '0',
                'comment_count' => $details['comment_count'] ?? 0,
                'comment_count_formatted' => $details['comment_count_formatted'] ?? '0',
                'channel_slug' => $channelSlug ?: null,
                'embed_url' => 'https://www.youtube.com/embed/' . $id . '?autoplay=0',
            ];
            $seoTitle = $details['title'];
            $seoDescription = Str::limit($details['description'], 160) ?: 'Watch this video on Unity Videos.';
        } else {
            // API unavailable or video not found: still show embed so the video can play
            $video = [
                'id' => $id,
                'slug' => $id,
                'title' => $creator ?: 'Video',
                'description' => '',
                'creator' => $creator ?: 'Channel',
                'creatorAvatar' => $creatorAvatar ? (str_starts_with($creatorAvatar, 'http') || str_starts_with($creatorAvatar, '/') ? $creatorAvatar : null) : null,
                'thumbnail_url' => 'https://img.youtube.com/vi/' . $id . '/mqdefault.jpg',
                'duration' => '',
                'views' => 0,
                'views_formatted' => '0',
                'time_ago' => '',
                'likes' => 0,
                'likes_formatted' => '0',
                'comment_count' => 0,
                'comment_count_formatted' => '0',
                'channel_slug' => $channelSlug ?: null,
                'embed_url' => 'https://www.youtube.com/embed/' . $id . '?autoplay=0',
            ];
            $seoTitle = $creator ?: 'Watch video';
            $seoDescription = 'Watch this video on Unity Videos.';
        }

        // More videos (like YouTube sidebar): full-length videos only (exclude current, Shorts, and 0:00)
        $allVideos = $this->fetchAllYouTubeVideos();
        $isShortOrInvalid = function (array $v): bool {
            $d = $v['duration'] ?? '';
            if (! is_string($d) || $d === '' || $d === '0:00') {
                return true;
            }
            return (bool) preg_match('/^(?:0:\d{1,2}|1:00)$/', $d);
        };
        $moreVideos = $allVideos
            ->reject(fn ($v) => ($v['slug'] ?? '') === $id)
            ->reject($isShortOrInvalid)
            ->take(20)
            ->values()
            ->all();

        // App engagement for this video (likes, comments, shares, user_liked)
        $engagement = $this->getVideoEngagement($id, 'yt', $channelSlug);
        $ytLikes = (int) ($video['likes'] ?? 0);
        $ytComments = (int) ($video['comment_count'] ?? 0);
        $video = array_merge($video, $engagement['video'], [
            'total_likes_formatted' => number_format($ytLikes + $engagement['video']['app_likes']),
            'total_comment_count_formatted' => number_format($ytComments + $engagement['video']['app_comment_count']),
        ]);
        $appComments = $engagement['app_comments'];

        // Comments from YouTube API
        $comments = app(YouTubeService::class)->getVideoComments($id, 40);

        return Inertia::render('frontend/community-videos/ShowYouTube', [
            'seo' => [
                'title' => $seoTitle,
                'description' => $seoDescription,
            ],
            'video' => $video,
            'moreVideos' => $moreVideos,
            'comments' => $comments,
            'appComments' => $appComments,
        ]);
    }

    /**
     * Shorts watch page: vertical player with top controls, right actions, bottom progress.
     */
    public function showShort(Request $request, string $id): Response
    {
        $details = app(YouTubeService::class)->getVideoDetails($id);
        $channelSlug = $request->query('channel_slug');
        $creator = $request->query('creator', '');
        $creatorAvatar = $request->query('creator_avatar');

        if ($details) {
            $creator = $creator ?: $details['channel_title'];
            $video = [
                'id' => $details['id'],
                'title' => $details['title'],
                'likes_formatted' => $details['likes_formatted'] ?? '0',
                'comment_count_formatted' => $details['comment_count_formatted'] ?? '0',
                'channel_slug' => $channelSlug ?: null,
                'creator' => $creator,
                'creatorAvatar' => $creatorAvatar ?: null,
            ];
            $seoTitle = $details['title'];
            $seoDescription = Str::limit($details['description'], 160) ?: 'Watch this short on Unity Videos.';
        } else {
            $video = [
                'id' => $id,
                'title' => $creator ?: 'Short',
                'likes_formatted' => '0',
                'comment_count_formatted' => '0',
                'channel_slug' => $channelSlug ?: null,
                'creator' => $creator ?: 'Channel',
                'creatorAvatar' => $creatorAvatar ? (str_starts_with($creatorAvatar, 'http') || str_starts_with($creatorAvatar, '/') ? $creatorAvatar : null) : null,
            ];
            $seoTitle = $creator ?: 'Short';
            $seoDescription = 'Watch this short on Unity Videos.';
        }

        $engagement = $this->getVideoEngagement($id, 'yt', $channelSlug);
        $ytLikes = $details ? (int) ($details['likes'] ?? 0) : 0;
        $ytComments = $details ? (int) ($details['comment_count'] ?? 0) : 0;
        $totalLikes = $ytLikes + $engagement['video']['app_likes'];
        $video = array_merge($video, $engagement['video'], [
            'total_likes' => $totalLikes,
            'total_likes_formatted' => number_format($totalLikes),
            'total_comment_count_formatted' => number_format($ytComments + $engagement['video']['app_comment_count']),
        ]);

        return Inertia::render('frontend/community-videos/ShowShort', [
            'seo' => [
                'title' => $seoTitle,
                'description' => $seoDescription,
            ],
            'video' => $video,
        ]);
    }

    private function formatVideo(CommunityVideo $v, bool $full = false, bool $includeSource = false): array
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

        if ($includeSource) {
            $data['source'] = 'upload';
            $data['sort_at'] = $v->created_at->timestamp;
        }

        if ($full) {
            $data['description'] = $v->description;
            $data['video_url'] = $v->video_url;
            $data['nonprofit'] = $v->organization ? $v->organization->name : null;
        }

        return $data;
    }
}
