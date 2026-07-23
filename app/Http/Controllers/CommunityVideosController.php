<?php

namespace App\Http\Controllers;

use App\Models\CommunityVideo;
use App\Models\CommunityVideoComment;
use App\Models\CommunityVideoLike;
use App\Models\CommunityVideoShare;
use App\Models\CommunityVideoView;
use App\Models\Organization;
use App\Models\User;
use App\Services\SupporterPrimaryOrganizationService;
use App\Services\YouTubeService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
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
    /**
     * Infinite-scroll JSON feed (always JSON — not the Inertia index page).
     */
    public function feed(Request $request): JsonResponse
    {
        $page = max(1, (int) $request->input('page', 1));

        try {
            $pageData = $this->buildHubVideoPage($request, $page, true);

            return response()->json([
                'videos' => $pageData['videos'],
                'has_more' => $pageData['has_more'],
                'next_page' => $pageData['next_page'],
            ]);
        } catch (\Throwable $e) {
            Log::error('Unity Videos feed failed', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            return response()->json([
                'videos' => [],
                'has_more' => false,
                'next_page' => $page + 1,
                'message' => 'Could not load more videos.',
            ], 500);
        }
    }

    public function index(Request $request): Response|JsonResponse
    {
        $search = $request->input('search', '');
        $tab = $request->input('tab', 'latest');
        $org = $request->input('org', 'all');
        // Primary-org default only on Non-Profits — other tabs must not inherit a forced org.
        if ($tab === 'nonprofits') {
            $orgFilterId = app(SupporterPrimaryOrganizationService::class)
                ->resolveListingOrganizationFilterId($request, 'org');
            if ($orgFilterId !== null) {
                $org = (string) $orgFilterId;
            } elseif (! $request->has('org')) {
                $org = 'all';
            }
        } elseif (! $request->has('org')) {
            $org = 'all';
        }
        // Keep org filter as a string — do not reuse $org for the auth user's Organization model.
        $orgFilter = is_scalar($org) ? (string) $org : 'all';
        $hub = $request->input('hub', 'all');
        $hubNormalized = 'all';
        $page = max(1, (int) $request->input('page', 1));
        $wantsJson = $request->wantsJson() || $request->header('X-Requested-With') === 'XMLHttpRequest';
        $isLoadMore = $wantsJson && $page > 1;

        try {
            $pageData = $this->buildHubVideoPage($request, $page, $isLoadMore);
            $hubNormalized = $pageData['hub'];
            $tab = $pageData['tab'];
            $videos = $pageData['videos'];
            $featured = $pageData['featured'];
            $shorts = $pageData['shorts'];
            $hasMore = $pageData['has_more'];
            $nextPage = $pageData['next_page'];
            $stats = $pageData['stats'];

            if ($isLoadMore) {
                return response()->json([
                    'videos' => $videos,
                    'has_more' => $hasMore,
                    'next_page' => $nextPage,
                ]);
            }

            $nonprofitOrganizations = $this->supporterSecondaryOrganizationsForPicker($request->user());

            $channelBanners = $this->getChannelBannersForIndex();

            // Current user's channel: org or supporter (for "Your YouTube Channel" sidebar / Connect CTA)
            $myChannel = null;
            $userOrgHasYoutube = false;
            $userOrgCanConnect = false;
            $authUserChannelSlug = null;
            $userId = Auth::id();
            if ($userId) {
                $userOrganization = Organization::query()
                    ->select('id', 'name', 'user_id', 'youtube_channel_url', 'registered_user_image')
                    ->where('user_id', $userId)
                    ->with('user:id,slug')
                    ->first();
                $currentUser = User::query()
                    ->select('id', 'name', 'slug', 'image', 'registered_user_image', 'youtube_channel_url')
                    ->find($userId);

                if ($userOrganization) {
                    $userOrgCanConnect = true;
                    if ($userOrganization->youtube_channel_url) {
                        $userOrgHasYoutube = true;
                        $youtubeService = app(YouTubeService::class);
                        $details = $youtubeService->getChannelDetails($userOrganization->youtube_channel_url);
                        $allPreview = $youtubeService->getChannelVideos($userOrganization->youtube_channel_url, 15);
                        $previewVideos = collect($allPreview)->filter(function ($v) {
                            $d = $v['duration'] ?? '';
                            if (! is_string($d) || $d === '' || $d === '0:00') {
                                return false;
                            }

                            return ! preg_match('/^(?:0:\d{1,2}|1:00)$/', $d);
                        })->take(6)->values()->all();
                        $userSlug = $userOrganization->user ? $userOrganization->user->slug : null;
                        if (! $userSlug && $userOrganization->user_id) {
                            $userSlug = User::query()->where('id', $userOrganization->user_id)->value('slug');
                        }
                        $authUserChannelSlug = $userSlug;
                        $myChannel = [
                            'name' => $details['name'] ?? $userOrganization->name,
                            'avatar' => $details['avatar_url'] ?? ($userOrganization->registered_user_image ? Storage::url($userOrganization->registered_user_image) : null),
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
                    $authUserChannelSlug = $currentUser->slug;
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
            // Keep any videos already loaded from buildHubVideoPage; only clear if never set.
            if (! isset($videos)) {
                $featured = null;
                $videos = [];
                $shorts = [];
                $stats = ['total_videos' => 0, 'livestream_replays' => 0];
                $hasMore = false;
                $nextPage = $page + 1;
            }
            if (! isset($channelBanners)) {
                $channelBanners = [];
            }
            if (! isset($nonprofitOrganizations)) {
                $nonprofitOrganizations = [];
            }
            if (! isset($myChannel)) {
                $myChannel = null;
                $authUserChannelSlug = null;
                $userOrgHasYoutube = false;
                $userOrgCanConnect = false;
            }

            if ($isLoadMore) {
                return response()->json([
                    'videos' => [],
                    'has_more' => false,
                    'next_page' => $nextPage ?? ($page + 1),
                ]);
            }
        }

        return Inertia::render('frontend/community-videos/Index', [
            'seo' => [
                'title' => 'Unity Videos',
                'description' => 'Watch and share inspiring stories and community events from our supporters and nonprofits on Unity Videos.',
            ],
            'channelBanners' => $channelBanners ?? [],
            'featuredVideo' => $featured ?? null,
            'videos' => $videos ?? [],
            'shorts' => $shorts ?? [],
            'filters' => [
                'search' => $search,
                'tab' => $tab,
                'org' => $orgFilter,
                'hub' => $hubNormalized,
            ],
            'nonprofitOrganizations' => $nonprofitOrganizations ?? [],
            'secondaryOrganizations' => $nonprofitOrganizations ?? [],
            'stats' => $stats ?? ['total_videos' => 0, 'livestream_replays' => 0],
            'videos_has_more' => $hasMore ?? false,
            'videos_next_page' => $nextPage ?? 2,
            'myChannel' => $myChannel ?? null,
            'authUserChannelSlug' => $authUserChannelSlug ?? null,
            'userOrgHasYoutube' => $userOrgHasYoutube ?? false,
            'userOrgCanConnect' => $userOrgCanConnect ?? false,
            'organizationFilterLock' => $tab === 'nonprofits'
                ? app(SupporterPrimaryOrganizationService::class)->listingFilterLockState($request, 'org')
                : (static function () use ($request) {
                    $service = app(SupporterPrimaryOrganizationService::class);
                    $primaryId = $service->defaultOrganizationFilterId($request->user());
                    $primaryName = null;
                    $primarySlug = null;
                    if ($primaryId !== null) {
                        $org = Organization::query()->with('user:id,slug')->find($primaryId);
                        $primaryName = $org?->name;
                        $primarySlug = $org?->user?->slug;
                    }

                    return [
                        'locked' => false,
                        'primary_id' => $primaryId,
                        'primary_name' => $primaryName,
                        'primary_slug' => $primarySlug,
                    ];
                })(),
        ]);
    }

    /**
     * Build one page of the Unity Videos hub grid (shared by index + JSON feed).
     *
     * @return array{
     *     videos: array<int, array<string, mixed>>,
     *     featured: array<string, mixed>|null,
     *     shorts: array<int, array<string, mixed>>,
     *     has_more: bool,
     *     next_page: int,
     *     stats: array{total_videos: int, livestream_replays: int},
     *     hub: string,
     *     tab: string
     * }
     */
    private function buildHubVideoPage(Request $request, int $page, bool $jsonOnly): array
    {
        $search = (string) $request->input('search', '');
        $tab = (string) $request->input('tab', 'latest');
        $org = $request->input('org', 'all');
        if ($tab === 'nonprofits') {
            $orgFilterId = app(SupporterPrimaryOrganizationService::class)
                ->resolveListingOrganizationFilterId($request, 'org');
            if ($orgFilterId !== null) {
                $org = (string) $orgFilterId;
            } elseif (! $request->has('org')) {
                $org = 'all';
            }
        } elseif (! $request->has('org')) {
            $org = 'all';
        }
        $orgFilter = is_scalar($org) ? (string) $org : 'all';
        $hub = (string) $request->input('hub', 'all');

        $allowedNonprofitOrgIds = null;
        $onlyOrganizationIds = null;
        if ($tab === 'nonprofits') {
            $allowedNonprofitOrgIds = $this->supporterPrimaryAndSecondaryOrgIds($request->user());
            if ($orgFilter !== 'all' && $orgFilter !== '' && (int) $orgFilter > 0) {
                $picked = (int) $orgFilter;
                // Only allow primary / secondary orgs (same scope as donate picker).
                if ($allowedNonprofitOrgIds === [] || in_array($picked, $allowedNonprofitOrgIds, true)) {
                    $onlyOrganizationIds = [$picked];
                } else {
                    $onlyOrganizationIds = $allowedNonprofitOrgIds !== [] ? $allowedNonprofitOrgIds : [$picked];
                }
            } elseif ($allowedNonprofitOrgIds !== []) {
                // org=all after Change → videos from primary + secondary only, not every platform org.
                $onlyOrganizationIds = $allowedNonprofitOrgIds;
            }
        }

        // Always rebuild from currently connected channels (per-channel YouTube API is cached).
        // Non-Profits scopes to primary/secondary (or one picked org).
        $youtubeVideos = $this->fetchAllYouTubeVideos($onlyOrganizationIds);

        if ($search !== '') {
            $searchLower = strtolower($search);
            $youtubeVideos = $youtubeVideos->filter(function ($v) use ($searchLower) {
                return str_contains(strtolower($v['title'] ?? ''), $searchLower)
                    || str_contains(strtolower($v['creator'] ?? ''), $searchLower);
            })->values();
        }

        if ($tab === 'trending') {
            $youtubeVideos = $youtubeVideos->sortByDesc('views')->values();
        } elseif ($tab === 'nonprofits') {
            $youtubeVideos = $youtubeVideos->filter(fn ($v) => ! empty($v['organization_id'] ?? null))->sortBy('creator')->values();
            if ($orgFilter !== 'all' && $orgFilter !== '' && (int) $orgFilter > 0) {
                $orgId = (int) $orgFilter;
                $youtubeVideos = $youtubeVideos->filter(fn ($v) => (int) ($v['organization_id'] ?? 0) === $orgId)->values();
            }
        } elseif ($tab === 'supporter') {
            $youtubeVideos = $youtubeVideos->filter(fn ($v) => empty($v['organization_id'] ?? null))->sortByDesc('sort_at')->values();
        } else {
            $tab = 'latest';
            $youtubeVideos = $youtubeVideos->sortByDesc('sort_at')->values();
        }

        $userId = Auth::id();
        $youtubeVideos = $this->attachEngagementAndRank($youtubeVideos, $userId, $tab);

        $youtubeService = app(YouTubeService::class);
        $youtubeVideos = $youtubeVideos->reject(function ($v) use ($youtubeService) {
            if (! is_array($v)) {
                return true;
            }
            // Hub import UI is hidden — never surface URL-imported rows on the hub feed.
            if (($v['source'] ?? '') === 'import') {
                return true;
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

        $shortsStrip = $shortsStrip->filter($isShort)->values();
        $shortsStrip = $shortsStrip
            ->unique(fn (array $v) => (string) ($v['id'] ?? $v['slug'] ?? ''))
            ->values();
        $shorts = $jsonOnly ? [] : $shortsStrip->take(48)->values()->all();

        $listForGrid = $hubNormalized === 'shorts'
            ? $gridPool
            : $gridPool->reject($isShort)->values();

        // Unique per publisher row (same YT video may list under multiple BIU accounts).
        $listForGrid = $listForGrid
            ->unique(fn (array $v) => (string) ($v['id'] ?? ''))
            ->values();

        $authUserId = null;
        $authOrgId = null;
        [$authUserId, $authOrgId] = $this->authViewerImportContext();

        $markMyImport = function (array $v) use ($authUserId, $authOrgId): array {
            $v['is_my_import'] = $this->isMyImportedHubVideo($v, $authUserId, $authOrgId);

            return $v;
        };

        $listForGrid = $listForGrid->map($markMyImport)->values();
        $shorts = array_map($markMyImport, $shorts);

        $gridPerPage = 12;
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

        return [
            'videos' => $videos,
            'featured' => $featured,
            'shorts' => $shorts,
            'has_more' => $totalVideos > 1 + $gridPerPage * $page,
            'next_page' => $page + 1,
            'stats' => [
                'total_videos' => $totalVideos,
                'livestream_replays' => $vodNonShort->filter($isLiveHub)->count(),
            ],
            'hub' => $hubNormalized,
            'tab' => $tab,
        ];
    }

    /**
     * True only for URL-imported videos owned by the current viewer (never shown to others as "theirs").
     *
     * @param  array<string, mixed>  $v
     */
    private function isMyImportedHubVideo(array $v, ?int $authUserId, ?int $authOrgId): bool
    {
        if (! $authUserId || ($v['source'] ?? '') !== 'import') {
            return false;
        }

        $orgId = isset($v['organization_id']) ? (int) $v['organization_id'] : 0;
        if ($orgId > 0) {
            return $authOrgId !== null && $orgId === $authOrgId;
        }

        return (int) ($v['owner_user_id'] ?? 0) === $authUserId;
    }

    /**
     * @return array{0: ?int, 1: ?int} [authUserId, authOrgId]
     */
    private function authViewerImportContext(): array
    {
        $authUserId = Auth::id();
        if (! $authUserId) {
            return [null, null];
        }
        $authOrgId = Organization::query()->where('user_id', $authUserId)->value('id');

        return [(int) $authUserId, $authOrgId ? (int) $authOrgId : null];
    }

    private function isMyCommunityVideoImport(CommunityVideo $v, ?int $authUserId, ?int $authOrgId): bool
    {
        if (! $authUserId || empty($v->youtube_video_id)) {
            return false;
        }
        if ($v->organization_id) {
            return $authOrgId !== null && (int) $v->organization_id === $authOrgId;
        }

        return (int) ($v->user_id ?? 0) === $authUserId;
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     * @return array<int, array<string, mixed>>
     */
    private function markHubRowsWithMyImport(array $rows): array
    {
        [$authUserId, $authOrgId] = $this->authViewerImportContext();

        return array_map(function (array $v) use ($authUserId, $authOrgId) {
            $v['is_my_import'] = $this->isMyImportedHubVideo($v, $authUserId, $authOrgId);

            return $v;
        }, $rows);
    }

    private function viewerOwnsImportedYoutubeId(string $youtubeVideoId): bool
    {
        [$authUserId, $authOrgId] = $this->authViewerImportContext();
        if (! $authUserId || $youtubeVideoId === '') {
            return false;
        }

        $query = CommunityVideo::query()->where('youtube_video_id', $youtubeVideoId);
        if ($authOrgId) {
            return $query->where('organization_id', $authOrgId)->exists();
        }

        return $query->where('user_id', $authUserId)->exists();
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
            ->where('youtube_channel_url', '!=', '')
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
            ->where('youtube_channel_url', '!=', '')
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
            ->where('youtube_channel_url', '!=', '')
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
     * Prefetch per-channel YouTube API payloads for currently connected accounts.
     * Does not write an aggregate hub list (that raced with disconnect and kept dead channels visible).
     */
    public function warmUnityVideosCache(): void
    {
        try {
            $youtubeService = app(YouTubeService::class);
            $urls = Organization::query()
                ->excludingCareAllianceHubs()
                ->whereNotNull('youtube_channel_url')
                ->where('youtube_channel_url', '!=', '')
                ->pluck('youtube_channel_url')
                ->merge(
                    User::query()
                        ->whereNotNull('youtube_channel_url')
                        ->where('youtube_channel_url', '!=', '')
                        ->pluck('youtube_channel_url')
                )
                ->filter()
                ->unique()
                ->values();

            foreach ($urls as $channelUrl) {
                try {
                    $youtubeService->getChannelDetails($channelUrl);
                    $youtubeService->getChannelVideos($channelUrl, 30);
                    $youtubeService->getChannelLiveStreams($channelUrl, 10);
                } catch (\Throwable $e) {
                    Log::warning('Unity Videos channel warm failed', [
                        'channel_url' => $channelUrl,
                        'message' => $e->getMessage(),
                    ]);
                }
            }

            // Drop any leftover aggregate keys from older deploys.
            $this->forgetUnityVideosCaches();

            Log::info('Unity Videos per-channel cache warmed', ['channels' => $urls->count()]);
        } catch (\Throwable $e) {
            Log::warning('Unity Videos cache warm failed', ['message' => $e->getMessage()]);
        }
    }

    /**
     * Drop hub aggregate keys (legacy) and optional per-channel YouTube caches.
     */
    public function forgetUnityVideosCaches(?string $channelUrl = null): void
    {
        Cache::forget('unity_videos_all_v7');
        Cache::forget('unity_videos_all_v6');
        Cache::forget('unity_videos_all_v5');
        Cache::forget('unity_videos_all_v4');
        Cache::forget('unity_videos_all');

        if ($channelUrl !== null && $channelUrl !== '') {
            app(YouTubeService::class)->forgetCachesForChannelUrl($channelUrl);
        }
    }

    /**
     * Primary + secondary organization IDs for the logged-in supporter (donate-page scope).
     *
     * @return list<int>
     */
    private function supporterPrimaryAndSecondaryOrgIds(?User $user): array
    {
        if ($user === null) {
            return [];
        }

        $service = app(SupporterPrimaryOrganizationService::class);
        $primaryId = $service->defaultOrganizationFilterId($user);
        $ids = $service->resolveSecondaryOrganizationIds($user);
        if ($primaryId !== null && $primaryId > 0 && ! in_array($primaryId, $ids, true)) {
            array_unshift($ids, $primaryId);
        }

        return array_values(array_unique(array_filter(
            array_map('intval', $ids),
            fn (int $id) => $id > 0
        )));
    }

    /**
     * Secondary orgs for the Non-Profits picker (excludes primary — lock UI shows primary).
     *
     * @return list<array{id: int, name: string}>
     */
    private function supporterSecondaryOrganizationsForPicker(?User $user): array
    {
        if ($user === null) {
            return [];
        }

        $service = app(SupporterPrimaryOrganizationService::class);
        $primaryId = $service->defaultOrganizationFilterId($user);
        $ids = $service->resolveSecondaryOrganizationIds($user);
        if ($ids === []) {
            return [];
        }

        return Organization::query()
            ->excludingCareAllianceHubs()
            ->whereIn('id', $ids)
            ->when($primaryId !== null, fn ($q) => $q->where('id', '!=', $primaryId))
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (Organization $o) => ['id' => (int) $o->id, 'name' => (string) $o->name])
            ->values()
            ->all();
    }

    /**
     * Fetch videos from connected YouTube channels (optionally a set of organizations), then merge imports.
     *
     * @param  list<int>|null  $onlyOrganizationIds
     * @return Collection<int, array<string, mixed>>
     */
    private function fetchAllYouTubeVideos(?array $onlyOrganizationIds = null): Collection
    {
        $orgsQuery = Organization::query()
            ->excludingCareAllianceHubs()
            ->select('id', 'name', 'registered_user_image', 'user_id', 'youtube_channel_url')
            ->whereNotNull('youtube_channel_url')
            ->where('youtube_channel_url', '!=', '')
            ->with('user:id,slug');

        if ($onlyOrganizationIds !== null) {
            $ids = array_values(array_filter(array_map('intval', $onlyOrganizationIds), fn (int $id) => $id > 0));
            if ($ids === []) {
                return collect();
            }
            $orgsQuery->whereIn('id', $ids);
        }

        $orgs = $orgsQuery->get();

        $orgOwnerIds = $orgs->pluck('user_id')->filter()->all();
        $supporters = collect();
        if ($onlyOrganizationIds === null) {
            $supporters = User::query()
                ->select('id', 'name', 'slug', 'image', 'registered_user_image', 'youtube_channel_url')
                ->whereNotNull('youtube_channel_url')
                ->where('youtube_channel_url', '!=', '')
                ->whereNotNull('slug')
                ->when(! empty($orgOwnerIds), fn ($q) => $q->whereNotIn('id', $orgOwnerIds))
                ->get();
        }

        $youtubeService = app(YouTubeService::class);
        $all = collect();

        foreach ($orgs as $org) {
            try {
                $channelVideos = $youtubeService->getChannelVideos($org->youtube_channel_url, 30);
                $channelSlug = $org->user?->slug;
                $creatorAvatar = $org->registered_user_image ? Storage::url($org->registered_user_image) : null;

                foreach ($channelVideos as $yt) {
                    $publishedAt = $yt['published_at'] ?? '';
                    $sortAt = $publishedAt ? Carbon::parse($publishedAt)->timestamp : 0;
                    $timeAgo = $publishedAt ? Carbon::parse($publishedAt)->diffForHumans() : '';

                    $all->push(array_merge([
                        'id' => $this->hubListId($yt['id'], $org->id, null),
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
                        'owner_user_id' => $org->user_id,
                        'hub_kind' => 'vod',
                        'source' => 'youtube',
                        'watch_url' => $yt['watch_url'],
                        'sort_at' => $sortAt,
                    ], $this->youtubeShortMetaFromYtRow($yt)));
                }

                $liveStreams = $youtubeService->getChannelLiveStreams($org->youtube_channel_url, 10);
                // Only skip lives already listed for THIS org (other accounts may still list the same YT id).
                $existingForOrg = $all
                    ->filter(fn (array $v) => (int) ($v['organization_id'] ?? 0) === (int) $org->id)
                    ->pluck('slug')
                    ->flip();
                foreach ($liveStreams as $yt) {
                    if ($existingForOrg->has($yt['id'])) {
                        continue;
                    }
                    $publishedAt = $yt['published_at'] ?? '';
                    $timeAgo = $publishedAt ? Carbon::parse($publishedAt)->diffForHumans() : '';
                    $all->push(array_merge([
                        'id' => $this->hubListId($yt['id'], $org->id, null),
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
                        'owner_user_id' => $org->user_id,
                        'hub_kind' => 'live',
                        'source' => 'youtube',
                        'watch_url' => $yt['watch_url'],
                        'sort_at' => PHP_INT_MAX,
                    ], $this->youtubeShortMetaFromYtRow($yt)));
                }
            } catch (\Throwable $e) {
                Log::warning('Unity Videos: skip organization channel', [
                    'organization_id' => $org->id,
                    'message' => $e->getMessage(),
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

                $all->push(array_merge([
                    'id' => $this->hubListId($yt['id'], null, $supporter->id),
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
                    'owner_user_id' => $supporter->id,
                    'hub_kind' => 'vod',
                    'source' => 'youtube',
                    'watch_url' => $yt['watch_url'],
                    'sort_at' => $sortAt,
                ], $this->youtubeShortMetaFromYtRow($yt)));
            }

            try {
                $liveStreams = $youtubeService->getChannelLiveStreams($supporter->youtube_channel_url, 10);
                $existingForUser = $all
                    ->filter(fn (array $v) => (int) ($v['owner_user_id'] ?? 0) === (int) $supporter->id)
                    ->pluck('slug')
                    ->flip();
                foreach ($liveStreams as $yt) {
                    if ($existingForUser->has($yt['id'])) {
                        continue;
                    }
                    $publishedAt = $yt['published_at'] ?? '';
                    $timeAgo = $publishedAt ? Carbon::parse($publishedAt)->diffForHumans() : '';
                    $all->push(array_merge([
                        'id' => $this->hubListId($yt['id'], null, $supporter->id),
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
                        'owner_user_id' => $supporter->id,
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

        // URL-import sidebar is hidden on the hub — do not list pasted imports there either
        // (appendImportedUrlVideos kept for easy restore; set $includeUrlImportsInHub = true).
        $includeUrlImportsInHub = false;
        if ($includeUrlImportsInHub) {
            $all = $this->appendImportedUrlVideos($all, $onlyOrganizationIds);
        }

        // Unique list rows per publisher account (same YT id may appear for multiple BIU accounts).
        return $all
            ->unique(fn (array $v) => (string) ($v['id'] ?? ''))
            ->sortByDesc('sort_at')
            ->values();
    }

    /**
     * Stable React/list id: YouTube video + which BIU account published it.
     */
    private function hubListId(string $youtubeVideoId, ?int $organizationId, ?int $userId, ?int $importRecordId = null): string
    {
        if ($importRecordId) {
            return 'yt-'.$youtubeVideoId.'-import-'.$importRecordId;
        }
        if ($organizationId) {
            return 'yt-'.$youtubeVideoId.'-org-'.$organizationId;
        }
        if ($userId) {
            return 'yt-'.$youtubeVideoId.'-user-'.$userId;
        }

        return 'yt-'.$youtubeVideoId;
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
            : sprintf('https://img.youtube.com/vi/%s/hqdefault.jpg', $videoId);
        $durationSeconds = is_array($details) ? max(0, (int) ($details['duration_seconds'] ?? 0)) : 0;
        $durationDisplay = is_array($details) ? (string) ($details['duration'] ?? '') : '';

        if ($durationSeconds < 1 && $durationDisplay !== '' && $durationDisplay !== 'LIVE') {
            $durationSeconds = $this->parseYoutubeDurationDisplayToSeconds($durationDisplay);
        }

        if ($durationSeconds < 1 && str_contains(strtolower($url), '/shorts/')) {
            $durationSeconds = 30;
            $durationDisplay = $durationDisplay !== '' ? $durationDisplay : '0:30';
        }

        $isShort = $this->isImportedUrlShort($url);
        $category = $isShort ? 'shorts' : 'videos';

        $watchUrl = str_contains(strtolower($url), '/shorts/')
            ? 'https://www.youtube.com/shorts/'.$videoId
            : 'https://www.youtube.com/watch?v='.$videoId;

        $communityVideo = CommunityVideo::updateOrCreate(
            $organizationId
                ? ['youtube_video_id' => $videoId, 'organization_id' => $organizationId]
                : ['youtube_video_id' => $videoId, 'user_id' => $userId],
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

        $this->forgetUnityVideosCaches();

        $hubRow = $this->hubRowFromImportedCommunityVideo($communityVideo, $details, $youtubeService);
        $hubRow['is_my_import'] = true;

        return response()->json([
            'message' => $isShort
                ? 'Your YouTube Short was added to Unity Video Hub.'
                : 'Your video was added to Unity Video Hub.',
            'video' => $hubRow,
            'is_short' => $isShort,
        ], 201);
    }

    /**
     * Remove a URL-imported video from Unity Video Hub (owner / org owner only).
     */
    public function destroyImport(Request $request, CommunityVideo $communityVideo): \Illuminate\Http\JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        if (empty($communityVideo->youtube_video_id)) {
            return response()->json(['message' => 'Only imported YouTube videos can be removed this way.'], 422);
        }

        $organization = Organization::forAuthUser($user);
        $owns = false;
        if ($communityVideo->organization_id) {
            $owns = $organization !== null && (int) $communityVideo->organization_id === (int) $organization->id;
        } else {
            $owns = (int) ($communityVideo->user_id ?? 0) === (int) $user->id;
        }

        if (! $owns) {
            return response()->json(['message' => 'You can only remove videos you imported.'], 403);
        }

        $communityVideo->delete();
        $this->forgetUnityVideosCaches();

        return response()->json(['message' => 'Imported video removed from Unity Videos.']);
    }

    /**
     * Merge URL-imported hub videos (CommunityVideo rows) into the aggregate feed.
     *
     * @param  Collection<int, array<string, mixed>>  $all
     * @param  list<int>|null  $onlyOrganizationIds
     * @return Collection<int, array<string, mixed>>
     */
    private function appendImportedUrlVideos(Collection $all, ?array $onlyOrganizationIds = null): Collection
    {
        $youtubeService = app(YouTubeService::class);

        $importsQuery = CommunityVideo::query()
            ->whereNotNull('youtube_video_id')
            ->with([
                'organization:id,name,registered_user_image,user_id',
                'organization.user:id,slug,name',
                'user:id,name,slug,image,registered_user_image',
            ])
            ->orderByDesc('created_at');

        if ($onlyOrganizationIds !== null) {
            $ids = array_values(array_filter(array_map('intval', $onlyOrganizationIds), fn (int $id) => $id > 0));
            if ($ids === []) {
                return $all;
            }
            $importsQuery->whereIn('organization_id', $ids);
        }

        $imports = $importsQuery->get();

        foreach ($imports as $record) {
            $videoId = (string) $record->youtube_video_id;
            if ($videoId === '') {
                continue;
            }

            // Skip only if this publisher already has the same YT id from channel sync or a prior import row.
            $orgId = $record->organization_id ? (int) $record->organization_id : null;
            $ownerUserId = $record->user_id ? (int) $record->user_id : ($record->organization?->user_id ? (int) $record->organization->user_id : null);
            $alreadyListed = $all->contains(function (array $v) use ($videoId, $orgId, $ownerUserId) {
                if ((string) ($v['slug'] ?? '') !== $videoId) {
                    return false;
                }
                if ($orgId && (int) ($v['organization_id'] ?? 0) === $orgId) {
                    return true;
                }
                if (! $orgId && $ownerUserId && (int) ($v['owner_user_id'] ?? 0) === $ownerUserId) {
                    return true;
                }

                return false;
            });
            if ($alreadyListed) {
                continue;
            }

            $this->syncImportedVideoCategory($record);

            $all->push($this->hubRowFromImportedCommunityVideo($record, null, $youtubeService));
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

        $thumb = $record->thumbnail_url ?: sprintf('https://img.youtube.com/vi/%s/hqdefault.jpg', $videoId);

        $base = [
            'id' => $this->hubListId($videoId, $organizationId, $organizationId ? null : ($owner?->id), $record->id),
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
            'owner_user_id' => $organizationId ? ($org?->user_id) : ($owner?->id),
            'hub_kind' => 'vod',
            'source' => 'import',
            'import_record_id' => $record->id,
            'watch_url' => $watchUrl,
            'sort_at' => $sortAt,
            'description' => $description,
            'duration_seconds' => $durationSeconds,
            'thumbnail_width' => 0,
            'thumbnail_height' => 0,
        ];

        $isShort = $record->category === 'shorts';

        return array_merge($base, [
            'is_youtube_short' => $isShort,
        ]);
    }

    /**
     * Imported hub items are Shorts only when the saved URL is a YouTube Shorts link.
     */
    private function isImportedUrlShort(string $url): bool
    {
        return str_contains(strtolower(trim($url)), '/shorts/');
    }

    /**
     * Keep CommunityVideo.category aligned with the pasted URL (/shorts/ vs watch/youtu.be).
     */
    private function syncImportedVideoCategory(CommunityVideo $record): void
    {
        $url = (string) ($record->video_url ?? '');
        if ($url === '') {
            return;
        }

        $category = $this->isImportedUrlShort($url) ? 'shorts' : 'videos';
        if ($record->category !== $category) {
            $record->update(['category' => $category]);
            $record->category = $category;
        }
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
        $shortRecords = $collection->filter(fn (CommunityVideo $v) => $v->category === 'shorts');
        $vodRecords = $collection->reject(fn (CommunityVideo $v) => $v->category === 'shorts');
        [$authUserId, $authOrgId] = $this->authViewerImportContext();
        $videos = $vodRecords->map(fn (CommunityVideo $v) => $this->formatVideo($v, false, false, $authUserId, $authOrgId));
        $totalVideos = $collection->count();
        $totalViews = (int) $collection->sum('views');

        $youtubeVideos = [];
        $channelBannerUrl = null;
        $youtubeService = app(YouTubeService::class);
        if ($channelUrl) {
            // Fresh channel list (bypass cache) so disconnect/reconnect is accurate on this page.
            $youtubeVideos = $youtubeService->getChannelVideos($channelUrl, 30, false);
            $liveStreams = $youtubeService->getChannelLiveStreams($channelUrl, 10, false);
            $existingIds = array_flip(array_column($youtubeVideos, 'id'));
            foreach ($liveStreams as $live) {
                if (! isset($existingIds[$live['id']])) {
                    array_unshift($youtubeVideos, $live);
                    $existingIds[$live['id']] = true;
                }
            }
            $youtubeVideos = array_values(array_filter($youtubeVideos, function ($v) use ($youtubeService) {
                return ! $youtubeService->shouldOmitFromVideoHub($v);
            }));

            $channelDetails = $youtubeService->getChannelDetails($channelUrl);
            if ($channelDetails) {
                if (! empty($channelDetails['banner_url'])) {
                    $channelBannerUrl = $channelDetails['banner_url'];
                }
                if (isset($channelDetails['video_count'])) {
                    $totalVideos = (int) $channelDetails['video_count'];
                }
                if (isset($channelDetails['view_count'])) {
                    $totalViews = (int) $channelDetails['view_count'];
                }
            } else {
                $totalVideos = $totalVideos + count($youtubeVideos);
                $totalViews = $totalViews + (int) array_sum(array_column($youtubeVideos, 'views'));
            }
        }

        $importedShorts = $shortRecords->map(function (CommunityVideo $v) use ($slug, $channelName, $channelAvatar, $authUserId, $authOrgId) {
            return [
                'id' => (string) ($v->youtube_video_id ?: $v->slug),
                'slug' => (string) ($v->youtube_video_id ?: $v->slug),
                'title' => $v->title,
                'thumbnail_url' => $v->thumbnail_url ?: sprintf('https://img.youtube.com/vi/%s/mqdefault.jpg', $v->youtube_video_id),
                'views' => $v->views,
                'views_formatted' => number_format($v->views),
                'duration' => $v->formatted_duration,
                'channel_slug' => $slug,
                'creator' => $channelName,
                'creatorAvatar' => $channelAvatar,
                'source' => $v->youtube_video_id ? 'import' : 'upload',
                'is_my_import' => $this->isMyCommunityVideoImport($v, $authUserId, $authOrgId),
            ];
        })->values()->all();

        $ytShorts = [];
        $youtubeVideosForGrid = [];
        foreach ($youtubeVideos as $yt) {
            if ($youtubeService->isYoutubeShort($yt)) {
                $ytShorts[] = [
                    'id' => $yt['id'],
                    'slug' => $yt['id'],
                    'title' => $yt['title'],
                    'thumbnail_url' => $yt['thumbnail_url'],
                    'views' => $yt['views'],
                    'views_formatted' => $yt['views_formatted'],
                    'duration' => $yt['duration'] ?? '',
                    'channel_slug' => $slug,
                    'creator' => $channelName,
                    'creatorAvatar' => $channelAvatar,
                    'is_my_import' => $this->viewerOwnsImportedYoutubeId((string) $yt['id']),
                ];
            } else {
                $youtubeVideosForGrid[] = $yt;
            }
        }

        $seenShortIds = [];
        foreach ($ytShorts as $idx => $short) {
            $seenShortIds[(string) $short['id']] = $idx;
        }
        foreach ($importedShorts as $imported) {
            $importedId = (string) $imported['id'];
            if (isset($seenShortIds[$importedId])) {
                $idx = $seenShortIds[$importedId];
                if (! empty($imported['is_my_import'])) {
                    $ytShorts[$idx]['is_my_import'] = true;
                }
            } else {
                $ytShorts[] = $imported;
                $seenShortIds[$importedId] = count($ytShorts) - 1;
            }
        }
        $shorts = $ytShorts;

        $youtubeVideos = $this->attachEngagementToYoutubeVideoList($youtubeVideosForGrid, $slug, Auth::id());
        $youtubeVideos = array_map(function (array $v) {
            $v['is_my_import'] = $this->viewerOwnsImportedYoutubeId((string) ($v['id'] ?? ''));

            return $v;
        }, $youtubeVideos);

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

        [$authUserId, $authOrgId] = $this->authViewerImportContext();
        $formatted = $this->formatVideo($video, true, false, $authUserId, $authOrgId);

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
            ? $sameChannel->map(fn (CommunityVideo $v) => $this->formatVideo($v, false, false, $authUserId, $authOrgId))
            : $relatedQuery->limit(20)->get()->map(fn (CommunityVideo $v) => $this->formatVideo($v, false, false, $authUserId, $authOrgId));
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
        $moreVideos = $this->markHubRowsWithMyImport($moreVideos);

        // App engagement for this video (likes, comments, shares, user_liked)
        $engagement = $this->getVideoEngagement($id, 'yt', $channelSlug);
        $ytLikes = (int) ($video['likes'] ?? 0);
        $ytComments = (int) ($video['comment_count'] ?? 0);
        $video = array_merge($video, $engagement['video'], [
            'total_likes_formatted' => number_format($ytLikes + $engagement['video']['app_likes']),
            'total_comment_count_formatted' => number_format($ytComments + $engagement['video']['app_comment_count']),
            'is_my_import' => $this->viewerOwnsImportedYoutubeId($id),
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
            'is_my_import' => $this->viewerOwnsImportedYoutubeId($id),
        ]);

        return Inertia::render('frontend/community-videos/ShowShort', [
            'seo' => [
                'title' => $seoTitle,
                'description' => $seoDescription,
            ],
            'video' => $video,
        ]);
    }

    private function formatVideo(
        CommunityVideo $v,
        bool $full = false,
        bool $includeSource = false,
        ?int $authUserId = null,
        ?int $authOrgId = null
    ): array {
        $creatorName = $v->creator_name;
        $thumb = $v->thumbnail_url ?: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=320&q=80';

        $channelSlug = $v->organization?->user?->slug ?? $v->user?->slug ?? null;
        $isImport = ! empty($v->youtube_video_id);
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
            'source' => $isImport ? 'import' : 'upload',
            'is_my_import' => $this->isMyCommunityVideoImport($v, $authUserId, $authOrgId),
        ];

        if ($includeSource) {
            $data['source'] = $isImport ? 'import' : 'upload';
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
