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
        $hub = $request->input('hub', 'all');
        $hubNormalized = 'all';

        try {
            // Organizations with connected YouTube (for Non-Profits tab dropdown)
            $nonprofitOrganizations = Organization::query()
                ->excludingCareAllianceHubs()
                ->whereNotNull('youtube_channel_url')
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn ($o) => ['id' => $o->id, 'name' => $o->name])
                ->values()
                ->all();

            // Only YouTube videos from connected channels; cache 5 min for fast loads/reloads. On fetch failure, use stale cache if any.
            try {
                $youtubeVideos = Cache::remember('unity_videos_all_v2', 300, fn () => $this->fetchAllYouTubeVideos());
            } catch (\Throwable $e) {
                Log::warning('Unity Videos: fetch failed, using stale cache if available', ['message' => $e->getMessage()]);
                $youtubeVideos = Cache::get('unity_videos_all_v2');
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

            $youtubeService = app(YouTubeService::class);
            // Never list empty / 0:00 / zero-length items (not real videos or shorts). LIVE kept for live hub.
            $youtubeVideos = $youtubeVideos->reject(function (array $v) use ($youtubeService) {
                if (($v['source'] ?? '') === 'import') {
                    return false;
                }

                return $youtubeService->shouldOmitFromVideoHub($v);
            })->values();

            $isShort = static function (array $v) use ($youtubeService): bool {
                if (array_key_exists('is_youtube_short', $v)) {
                    return (bool) $v['is_youtube_short'];
                }

                return $youtubeService->isYoutubeShort($v);
            };

            $isLiveHub = static function (array $v): bool {
                if (($v['duration'] ?? '') === 'LIVE') {
                    return true;
                }

                return ($v['hub_kind'] ?? 'vod') === 'live';
            };

            $shortsAll = $youtubeVideos->filter($isShort)->values();
            $vodNonShort = $youtubeVideos->reject($isShort)->values();

            $hubNormalized = in_array($hub, ['all', 'shorts', 'videos', 'live_replays'], true) ? $hub : 'all';

            if ($hubNormalized === 'shorts') {
                $gridPool = $shortsAll;
                $shortsStrip = $shortsAll;
            } elseif ($hubNormalized === 'videos') {
                $gridPool = $vodNonShort->reject($isLiveHub)->values();
                $shortsStrip = collect();
            } elseif ($hubNormalized === 'live_replays') {
                $gridPool = $youtubeVideos->filter($isLiveHub)->values();
                $shortsStrip = collect();
            } else {
                $gridPool = $vodNonShort;
                $shortsStrip = $shortsAll;
            }

            // Top carousel: Shorts only (never surface full-length items in the strip).
            $shortsStrip = $shortsStrip->filter($isShort)->values();
            $shorts = $shortsStrip->take(48)->values()->all();

            // Main grid / featured: exclude Shorts everywhere except the Shorts hub (there the grid is the Shorts rail).
            $listForGrid = $hubNormalized === 'shorts'
                ? $gridPool
                : $gridPool->reject($isShort)->values();

            $gridPerPage = 12;
            $page = (int) $request->input('page', 1);
            $totalVideos = $listForGrid->count();
            $featured = null;
            $videos = [];
            if ($totalVideos > 0) {
                if ($page === 1) {
                    $featured = $listForGrid->first();
                    $videos = $listForGrid->slice(1, $gridPerPage)->values()->all();
                } else {
                    $offset = 1 + $gridPerPage * ($page - 1);
                    $videos = $listForGrid->slice($offset, $gridPerPage)->values()->all();
                }
            }
            $hasMore = $totalVideos > 1 + $gridPerPage * $page;
            $nextPage = $page + 1;

            $channelBanners = $this->getChannelBannersForIndex();

            $livestreamReplays = $vodNonShort->filter($isLiveHub)->count();
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

        // Load-more: return next page as JSON for infinite scroll (XHR or Accept: application/json)
        $wantsJson = $request->wantsJson() || $request->header('X-Requested-With') === 'XMLHttpRequest';
        if ($wantsJson && $page > 1) {
            return response()->json([
                'videos' => $videos ?? [],
                'has_more' => $hasMore ?? false,
                'next_page' => $nextPage ?? (int) $page + 1,
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
                'hub' => $hubNormalized,
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
            ->excludingCareAllianceHubs()
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
            ->excludingCareAllianceHubs()
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
            Cache::put('unity_videos_all_v2', $videos, 300);
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
            ->excludingCareAllianceHubs()
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

                $all->push(array_merge([
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
                    'hub_kind' => 'vod',
                    'source' => 'youtube',
                    'watch_url' => $yt['watch_url'],
                    'sort_at' => $sortAt,
                ], $this->youtubeShortMetaFromYtRow($yt)));
            }

            $liveStreams = $youtubeService->getChannelLiveStreams($org->youtube_channel_url, 10);
            $existingSlugs = $all->pluck('slug')->flip();
            foreach ($liveStreams as $yt) {
                if ($existingSlugs->has($yt['id'])) {
                    continue;
                }
                $publishedAt = $yt['published_at'] ?? '';
                $timeAgo = $publishedAt ? Carbon::parse($publishedAt)->diffForHumans() : '';
                $all->push(array_merge([
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
                    'hub_kind' => 'live',
                    'source' => 'youtube',
                    'watch_url' => $yt['watch_url'],
                    'sort_at' => PHP_INT_MAX,
                ], $this->youtubeShortMetaFromYtRow($yt)));
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

                $all->push(array_merge([
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
                    'hub_kind' => 'vod',
                    'source' => 'youtube',
                    'watch_url' => $yt['watch_url'],
                    'sort_at' => $sortAt,
                ], $this->youtubeShortMetaFromYtRow($yt)));
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
                    $all->push(array_merge([
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
                        'hub_kind' => 'live',
                        'source' => 'youtube',
                        'watch_url' => $yt['watch_url'],
                        'sort_at' => PHP_INT_MAX,
                    ], $this->youtubeShortMetaFromYtRow($yt)));
                }
            } catch (\Throwable $e) {
                // Non-fatal: we already have regular videos for this supporter
            }
        }

        $all = $this->appendImportedUrlVideos($all);

        return $all->sortByDesc('sort_at')->values();
    }

    /**
     * Import a public YouTube video by URL into Unity Video Hub (no channel connection required).
     */
    public function importFromUrl(Request $request): \Illuminate\Http\JsonResponse
    {
        $validated = $request->validate([
            'youtube_url' => 'required|string|max:2048',
        ]);

        $url = trim($validated['youtube_url']);
        $videoId = $this->extractYoutubeVideoId($url);
        if (! $videoId) {
            return response()->json([
                'message' => 'Please paste a valid public YouTube video URL (watch, Shorts, or youtu.be link).',
            ], 422);
        }

        /** @var User $user */
        $user = $request->user();
        $organization = Organization::forAuthUser($user);
        $organizationId = $organization?->id;
        $userId = $organizationId ? null : $user->id;

        $youtubeService = app(YouTubeService::class);
        $details = $youtubeService->getVideoDetails($videoId);

        $title = is_array($details) && ! empty($details['title'])
            ? (string) $details['title']
            : 'YouTube Video';
        $description = is_array($details) ? Str::limit((string) ($details['description'] ?? ''), 2000) : null;
        $thumbnailUrl = is_array($details) && ! empty($details['thumbnail_url'])
            ? (string) $details['thumbnail_url']
            : sprintf('https://img.youtube.com/vi/%s/maxresdefault.jpg', $videoId);
        $durationSeconds = is_array($details) ? max(0, (int) ($details['duration_seconds'] ?? 0)) : 0;
        $durationDisplay = is_array($details) ? (string) ($details['duration'] ?? '') : '';

        if ($durationSeconds < 1 && $durationDisplay !== '' && $durationDisplay !== 'LIVE') {
            $durationSeconds = $this->parseYoutubeDurationDisplayToSeconds($durationDisplay);
        }

        if ($durationSeconds < 1 && str_contains(strtolower($url), '/shorts/')) {
            $durationSeconds = 30;
            $durationDisplay = $durationDisplay !== '' ? $durationDisplay : '0:30';
        }

        $isShort = $this->importedVideoIsShort($url, $durationDisplay, $durationSeconds, $details, $youtubeService);
        $category = $isShort ? 'shorts' : 'videos';

        $watchUrl = str_contains(strtolower($url), '/shorts/')
            ? 'https://www.youtube.com/shorts/'.$videoId
            : 'https://www.youtube.com/watch?v='.$videoId;

        $communityVideo = CommunityVideo::updateOrCreate(
            ['youtube_video_id' => $videoId],
            [
                'title' => Str::limit($title, 255),
                'slug' => $videoId,
                'description' => $description,
                'thumbnail_url' => $thumbnailUrl,
                'video_url' => $watchUrl,
                'duration_seconds' => $durationSeconds,
                'organization_id' => $organizationId,
                'user_id' => $userId,
                'category' => $category,
            ]
        );

        $communityVideo->load([
            'organization:id,name,registered_user_image,user_id',
            'organization.user:id,slug,name',
            'user:id,name,slug,image,registered_user_image',
        ]);

        Cache::forget('unity_videos_all_v2');

        $hubRow = $this->hubRowFromImportedCommunityVideo($communityVideo, $details, $youtubeService);

        return response()->json([
            'message' => $isShort
                ? 'Your YouTube Short was added to Unity Video Hub.'
                : 'Your video was added to Unity Video Hub.',
            'video' => $hubRow,
            'is_short' => $isShort,
        ], 201);
    }

    /**
     * Merge URL-imported hub videos (CommunityVideo rows) into the aggregate feed.
     *
     * @param  Collection<int, array<string, mixed>>  $all
     * @return Collection<int, array<string, mixed>>
     */
    private function appendImportedUrlVideos(Collection $all): Collection
    {
        $existingSlugs = $all->pluck('slug')->flip();
        $youtubeService = app(YouTubeService::class);

        $imports = CommunityVideo::query()
            ->whereNotNull('youtube_video_id')
            ->with([
                'organization:id,name,registered_user_image,user_id',
                'organization.user:id,slug,name',
                'user:id,name,slug,image,registered_user_image',
            ])
            ->orderByDesc('created_at')
            ->get();

        foreach ($imports as $record) {
            $videoId = (string) $record->youtube_video_id;
            if ($videoId === '' || $existingSlugs->has($videoId)) {
                continue;
            }

            $all->push($this->hubRowFromImportedCommunityVideo($record, null, $youtubeService));
            $existingSlugs[$videoId] = true;
        }

        return $all;
    }

    /**
     * @param  array<string, mixed>|null  $apiDetails
     * @return array<string, mixed>
     */
    private function hubRowFromImportedCommunityVideo(
        CommunityVideo $record,
        ?array $apiDetails,
        YouTubeService $youtubeService
    ): array {
        $videoId = (string) $record->youtube_video_id;
        $org = $record->organization;
        $owner = $record->user;

        if ($org) {
            $creator = $org->name;
            $creatorAvatar = $org->registered_user_image ? Storage::url($org->registered_user_image) : null;
            $channelSlug = $org->user?->slug;
            $organizationId = $org->id;
        } else {
            $creator = $owner?->name ?? 'Community';
            $creatorAvatar = $owner?->registered_user_image
                ? Storage::url($owner->registered_user_image)
                : ($owner?->image ? Storage::url($owner->image) : null);
            $channelSlug = $owner?->slug;
            $organizationId = null;
        }

        $duration = $record->formatted_duration;
        $durationSeconds = (int) $record->duration_seconds;
        if (is_array($apiDetails)) {
            if (! empty($apiDetails['duration'])) {
                $duration = (string) $apiDetails['duration'];
            }
            if (isset($apiDetails['duration_seconds'])) {
                $durationSeconds = max($durationSeconds, (int) $apiDetails['duration_seconds']);
            }
        }

        $watchUrl = $record->video_url ?: ('https://www.youtube.com/watch?v='.$videoId);
        $description = $record->description ?? '';
        $title = $record->title;

        $views = is_array($apiDetails) ? (int) ($apiDetails['views'] ?? 0) : 0;
        $viewsFormatted = is_array($apiDetails)
            ? (string) ($apiDetails['views_formatted'] ?? number_format($views))
            : '0';
        $likes = is_array($apiDetails) ? (int) ($apiDetails['likes'] ?? 0) : 0;
        $commentCount = is_array($apiDetails) ? (int) ($apiDetails['comment_count'] ?? 0) : 0;
        $timeAgo = is_array($apiDetails) ? (string) ($apiDetails['time_ago'] ?? '') : $record->time_ago;
        $publishedAt = is_array($apiDetails) ? (string) ($apiDetails['published_at'] ?? '') : '';
        $sortAt = $publishedAt !== ''
            ? Carbon::parse($publishedAt)->timestamp
            : $record->created_at->timestamp;

        $thumb = $record->thumbnail_url ?: sprintf('https://img.youtube.com/vi/%s/maxresdefault.jpg', $videoId);

        $base = [
            'id' => 'yt-'.$videoId,
            'slug' => $videoId,
            'title' => $title,
            'creator' => $creator,
            'creatorAvatar' => $creatorAvatar,
            'thumbnail_url' => $thumb,
            'duration' => $duration,
            'views' => $views,
            'views_formatted' => $viewsFormatted,
            'time_ago' => $timeAgo,
            'likes' => $likes,
            'likes_formatted' => number_format($likes),
            'comment_count' => $commentCount,
            'comment_count_formatted' => number_format($commentCount),
            'channel_slug' => $channelSlug,
            'organization_id' => $organizationId,
            'hub_kind' => 'vod',
            'source' => 'import',
            'watch_url' => $watchUrl,
            'sort_at' => $sortAt,
            'description' => $description,
            'duration_seconds' => $durationSeconds,
            'thumbnail_width' => 0,
            'thumbnail_height' => 0,
        ];

        $isShort = $this->importedVideoIsShort($watchUrl, $duration, $durationSeconds, $apiDetails, $youtubeService)
            || $record->category === 'shorts';

        return array_merge($base, [
            'is_youtube_short' => $isShort,
        ]);
    }

    /**
     * @param  array<string, mixed>|null  $apiDetails
     */
    private function importedVideoIsShort(
        string $watchUrl,
        string $durationDisplay,
        int $durationSeconds,
        ?array $apiDetails,
        YouTubeService $youtubeService
    ): bool {
        if (str_contains(strtolower($watchUrl), '/shorts/')) {
            return true;
        }

        $row = [
            'title' => is_array($apiDetails) ? ($apiDetails['title'] ?? '') : '',
            'description' => is_array($apiDetails) ? ($apiDetails['description'] ?? '') : '',
            'duration' => $durationDisplay,
            'duration_seconds' => $durationSeconds,
            'thumbnail_width' => 0,
            'thumbnail_height' => 0,
        ];

        return $youtubeService->isYoutubeShort($row);
    }

    private function parseYoutubeDurationDisplayToSeconds(?string $d): int
    {
        if ($d === null || $d === '' || $d === 'LIVE') {
            return 0;
        }
        if (preg_match('/^(\d+):(\d{2})$/', $d, $m)) {
            return ((int) $m[1]) * 60 + (int) $m[2];
        }
        if (preg_match('/^(\d+):(\d{2}):(\d{2})$/', $d, $m)) {
            return ((int) $m[1]) * 3600 + ((int) $m[2]) * 60 + (int) $m[3];
        }

        return 0;
    }

    private function extractYoutubeVideoId(string $url): ?string
    {
        $url = trim($url);
        if ($url === '') {
            return null;
        }

        if (preg_match('~(?:www\.)?youtube\.com/shorts/([a-zA-Z0-9_-]{11})~', $url, $m)) {
            return $m[1];
        }

        if (preg_match('~(?:www\.)?youtube\.com/watch\?[^#]*\bv=([a-zA-Z0-9_-]{11})~', $url, $m)) {
            return $m[1];
        }

        if (preg_match('~youtu\.be/([a-zA-Z0-9_-]{11})~', $url, $m)) {
            return $m[1];
        }

        if (preg_match('~youtube\.com/embed/([a-zA-Z0-9_-]{11})~', $url, $m)) {
            return $m[1];
        }

        if (preg_match('~m\.youtube\.com/shorts/([a-zA-Z0-9_-]{11})~', $url, $m)) {
            return $m[1];
        }

        return null;
    }

    /**
     * Fields used for YouTube Shorts detection on the Unity Videos aggregate feed (from API upload rows or live placeholders).
     *
     * @param  array<string, mixed>  $yt
     * @return array<string, mixed>
     */
    private function youtubeShortMetaFromYtRow(array $yt): array
    {
        return [
            'description' => $yt['description'] ?? '',
            'duration_seconds' => (int) ($yt['duration_seconds'] ?? 0),
            'thumbnail_width' => (int) ($yt['thumbnail_width'] ?? 0),
            'thumbnail_height' => (int) ($yt['thumbnail_height'] ?? 0),
            'is_youtube_short' => (bool) ($yt['is_youtube_short'] ?? false),
        ];
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
        $youtubeService = app(YouTubeService::class);
        if ($channelUrl) {
            $youtubeVideos = $youtubeService->getChannelVideos($channelUrl, 24);
            $liveStreams = $youtubeService->getChannelLiveStreams($channelUrl, 10);
            $existingIds = array_flip(array_column($youtubeVideos, 'id'));
            foreach ($liveStreams as $live) {
                if (! isset($existingIds[$live['id']])) {
                    array_unshift($youtubeVideos, $live);
                    $existingIds[$live['id']] = true;
                }
            }
            // Drop empty / 0:00 / zero-length (not playable). LIVE kept.
            $youtubeVideos = array_values(array_filter($youtubeVideos, fn (array $v) => ! $youtubeService->shouldOmitFromVideoHub($v)));
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

        // Shorts shelf: same classification as Unity hub (hashtag / portrait thumb / Shorts URL + ≤60s).
        $shortsRaw = array_values(array_filter($youtubeVideos, fn ($v) => $youtubeService->isYoutubeShort($v)));
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
        $youtubeService = app(YouTubeService::class);
        $isShortOrInvalid = function (array $v) use ($youtubeService): bool {
            $d = $v['duration'] ?? '';
            if (! is_string($d) || $d === '' || $d === '0:00') {
                return true;
            }

            return $youtubeService->isYoutubeShort($v);
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
