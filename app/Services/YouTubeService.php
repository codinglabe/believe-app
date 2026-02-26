<?php

namespace App\Services;

use App\Models\Organization;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class YouTubeService
{
    private string $apiKey;

    private string $baseUrl = 'https://www.googleapis.com/youtube/v3';

    public function __construct()
    {
        $this->apiKey = config('services.youtube.api_key', '');
    }

    /**
     * HTTP client with SSL verification disabled (avoids cURL 60 on Windows).
     */
    private function http(): \Illuminate\Http\Client\PendingRequest
    {
        return Http::withOptions(['verify' => false]);
    }

    /**
     * Get channel ID from a YouTube channel URL.
     * Supports: /channel/UC..., /@handle, /c/custom
     */
    public function getChannelIdFromUrl(string $url): ?string
    {
        $url = trim($url);
        if (empty($this->apiKey)) {
            return null;
        }

        $parsed = parse_url(rtrim(preg_replace('#^https?://#', 'https://', $url), '/'));
        $host = $parsed['host'] ?? '';
        if (! str_contains($host, 'youtube.com') && ! str_contains($host, 'youtu.be')) {
            return null;
        }

        $path = $parsed['path'] ?? '';

        // https://www.youtube.com/channel/UCxxxxxxxxxx
        if (preg_match('#^/channel/([a-zA-Z0-9_-]+)$#', $path, $m)) {
            return $m[1];
        }

        // https://www.youtube.com/@handle
        if (preg_match('#^/@([a-zA-Z0-9_.-]+)$#', $path, $m)) {
            return $this->resolveChannelIdByHandle($m[1]);
        }

        // https://www.youtube.com/c/CustomName or /user/username (legacy)
        if (preg_match('#^/(c|user)/([a-zA-Z0-9_.-]+)$#', $path, $m)) {
            return $this->resolveChannelIdBySearch($url);
        }

        return null;
    }

    /**
     * Resolve channel ID for @handle using channels.list forHandle.
     */
    private function resolveChannelIdByHandle(string $handle): ?string
    {
        $response = $this->http()->get($this->baseUrl . '/channels', [
            'part' => 'id',
            'forHandle' => $handle,
            'key' => $this->apiKey,
        ]);

        if (! $response->successful()) {
            Log::warning('YouTube API channels.forHandle failed', ['handle' => $handle, 'body' => $response->body()]);

            return null;
        }

        $data = $response->json();
        $items = $data['items'] ?? [];

        return isset($items[0]['id']) ? $items[0]['id'] : null;
    }

    /**
     * Fallback: search for channel by URL (for /c/ or /user/ URLs).
     */
    private function resolveChannelIdBySearch(string $url): ?string
    {
        $response = $this->http()->get($this->baseUrl . '/search', [
            'part' => 'snippet',
            'type' => 'channel',
            'q' => $url,
            'key' => $this->apiKey,
            'maxResults' => 1,
        ]);

        if (! $response->successful()) {
            return null;
        }

        $data = $response->json();
        $items = $data['items'] ?? [];
        $channelId = $items[0]['snippet']['channelId'] ?? null;

        return $channelId;
    }

    /**
     * Fetch recent uploads from a channel. Returns array of video items for frontend.
     * No cache so new uploads (including Shorts) appear in real time.
     *
     * @return array<int, array{id: string, title: string, thumbnail_url: string, published_at: string, views: int, views_formatted: string, duration: string, watch_url: string}>
     */
    public function getChannelVideos(string $channelUrl, int $maxResults = 24): array
    {
        if (empty($this->apiKey)) {
            return [];
        }

        $channelId = $this->getChannelIdFromUrl($channelUrl);
        if (! $channelId) {
            return [];
        }

        $uploadsPlaylistId = $this->getUploadsPlaylistId($channelId);
        if (! $uploadsPlaylistId) {
            return [];
        }

        return $this->fetchPlaylistVideos($uploadsPlaylistId, $maxResults);
    }

    /**
     * Fetch currently live streams for a channel (search.list eventType=live).
     * Cached 3 minutes so live status stays fresh.
     *
     * @return array<int, array{id: string, title: string, thumbnail_url: string, published_at: string, views: int, views_formatted: string, duration: string, watch_url: string, likes: int, likes_formatted: string, comment_count: int, comment_count_formatted: string}>
     */
    public function getChannelLiveStreams(string $channelUrl, int $maxResults = 10): array
    {
        if (empty($this->apiKey)) {
            return [];
        }

        $channelId = $this->getChannelIdFromUrl($channelUrl);
        if (! $channelId) {
            return [];
        }

        $cacheKey = 'youtube_channel_live_' . md5($channelUrl) . '_' . $maxResults;

        return Cache::remember($cacheKey, 180, function () use ($channelId, $maxResults) {
            $response = $this->http()->get($this->baseUrl . '/search', [
                'part' => 'snippet',
                'channelId' => $channelId,
                'eventType' => 'live',
                'type' => 'video',
                'maxResults' => min(max(1, $maxResults), 50),
                'key' => $this->apiKey,
            ]);

            if (! $response->successful()) {
                return [];
            }

            $data = $response->json();
            $items = $data['items'] ?? [];
            $videoIds = [];
            foreach ($items as $item) {
                $videoId = $item['id']['videoId'] ?? null;
                if ($videoId) {
                    $videoIds[] = $videoId;
                }
            }
            if (empty($videoIds)) {
                return [];
            }

            $videosDetail = $this->fetchVideosDetails($videoIds);
            $out = [];
            foreach ($items as $item) {
                $videoId = $item['id']['videoId'] ?? null;
                if (! $videoId) {
                    continue;
                }
                $detail = $videosDetail[$videoId] ?? null;
                if (empty($detail)) {
                    continue;
                }
                $snippet = $item['snippet'] ?? [];
                $thumb = $this->bestThumbnail($snippet['thumbnails'] ?? []);
                if ($thumb === '') {
                    $thumb = 'https://img.youtube.com/vi/' . $videoId . '/mqdefault.jpg';
                }
                $likeCount = (int) ($detail['likeCount'] ?? 0);
                $commentCount = (int) ($detail['commentCount'] ?? 0);
                $out[] = [
                    'id' => $videoId,
                    'title' => $snippet['title'] ?? 'Video',
                    'thumbnail_url' => $thumb,
                    'published_at' => $snippet['publishedAt'] ?? '',
                    'views' => (int) ($detail['viewCount'] ?? 0),
                    'views_formatted' => number_format((int) ($detail['viewCount'] ?? 0)),
                    'duration' => 'LIVE',
                    'watch_url' => 'https://www.youtube.com/watch?v=' . $videoId,
                    'likes' => $likeCount,
                    'likes_formatted' => $detail['likes_formatted'] ?? number_format($likeCount),
                    'comment_count' => $commentCount,
                    'comment_count_formatted' => $detail['comment_count_formatted'] ?? number_format($commentCount),
                ];
            }

            return $out;
        });
    }

    private function getUploadsPlaylistId(string $channelId): ?string
    {
        $response = $this->http()->get($this->baseUrl . '/channels', [
            'part' => 'contentDetails',
            'id' => $channelId,
            'key' => $this->apiKey,
        ]);

        if (! $response->successful()) {
            return null;
        }

        $data = $response->json();
        $items = $data['items'] ?? [];

        return $items[0]['contentDetails']['relatedPlaylists']['uploads'] ?? null;
    }

    /**
     * Get channel details for banner and stats (video count, view count).
     * Cached 1 hour per channel URL.
     *
     * @return array{banner_url: string|null, video_count: int, view_count: int}|null
     */
    public function getChannelDetails(string $channelUrl): ?array
    {
        if (empty($this->apiKey)) {
            return null;
        }

        $channelId = $this->getChannelIdFromUrl($channelUrl);
        if (! $channelId) {
            return null;
        }

        $cacheKey = 'youtube_channel_details_' . md5($channelUrl);

        return Cache::remember($cacheKey, 3600, function () use ($channelId) {
            $response = $this->http()->get($this->baseUrl . '/channels', [
                'part' => 'brandingSettings,statistics',
                'id' => $channelId,
                'key' => $this->apiKey,
            ]);

            if (! $response->successful()) {
                return null;
            }

            $data = $response->json();
            $items = $data['items'] ?? [];
            $item = $items[0] ?? null;
            if (! $item) {
                return null;
            }

            $branding = $item['brandingSettings'] ?? [];
            $image = $branding['image'] ?? [];
            $bannerUrl = $image['bannerExternalUrl'] ?? null;
            $stats = $item['statistics'] ?? [];
            $videoCount = (int) ($stats['videoCount'] ?? 0);
            $viewCount = (int) ($stats['viewCount'] ?? 0);

            return [
                'banner_url' => $bannerUrl ? (string) $bannerUrl : null,
                'video_count' => $videoCount,
                'view_count' => $viewCount,
            ];
        });
    }

    /**
     * @return array<int, array{id: string, title: string, thumbnail_url: string, published_at: string, views: int, views_formatted: string, duration: string, watch_url: string}>
     */
    private function fetchPlaylistVideos(string $playlistId, int $maxResults): array
    {
        $response = $this->http()->get($this->baseUrl . '/playlistItems', [
            'part' => 'snippet,contentDetails',
            'playlistId' => $playlistId,
            'key' => $this->apiKey,
            'maxResults' => min($maxResults, 50),
        ]);

        if (! $response->successful()) {
            return [];
        }

        $data = $response->json();
        $items = $data['items'] ?? [];
        $videoIds = array_filter(array_map(fn ($i) => $items[$i]['contentDetails']['videoId'] ?? null, array_keys($items)));

        if (empty($videoIds)) {
            return [];
        }

        $videosDetail = $this->fetchVideosDetails($videoIds);
        $out = [];
        foreach ($items as $item) {
            $videoId = $item['contentDetails']['videoId'] ?? null;
            if (! $videoId) {
                continue;
            }
            $detail = $videosDetail[$videoId] ?? null;
            if (empty($detail)) {
                continue;
            }
            $snippet = $item['snippet'] ?? [];
            $thumb = $this->bestThumbnail($snippet['thumbnails'] ?? []);
            if ($thumb === '') {
                $thumb = 'https://img.youtube.com/vi/' . $videoId . '/mqdefault.jpg';
            }
            $likeCount = (int) ($detail['likeCount'] ?? 0);
            $commentCount = (int) ($detail['commentCount'] ?? 0);
            $out[] = [
                'id' => $videoId,
                'title' => $snippet['title'] ?? 'Video',
                'thumbnail_url' => $thumb,
                'published_at' => $snippet['publishedAt'] ?? '',
                'views' => (int) ($detail['viewCount'] ?? 0),
                'views_formatted' => number_format((int) ($detail['viewCount'] ?? 0)),
                'duration' => $this->formatIsoDuration($detail['duration'] ?? 'PT0S'),
                'watch_url' => 'https://www.youtube.com/watch?v=' . $videoId,
                'likes' => $likeCount,
                'likes_formatted' => $detail['likes_formatted'] ?? number_format($likeCount),
                'comment_count' => $commentCount,
                'comment_count_formatted' => $detail['comment_count_formatted'] ?? number_format($commentCount),
            ];
        }

        return $out;
    }

    /**
     * Get single video details for watch page (title, description, channel, views, etc.).
     *
     * @return array<string, mixed>|null
     */
    public function getVideoDetails(string $videoId): ?array
    {
        if (empty($this->apiKey)) {
            return null;
        }

        $response = $this->http()->get($this->baseUrl . '/videos', [
            'part' => 'snippet,statistics,contentDetails',
            'id' => $videoId,
            'key' => $this->apiKey,
        ]);

        if (! $response->successful()) {
            return null;
        }

        $data = $response->json();
        $items = $data['items'] ?? [];
        $item = $items[0] ?? null;
        if (! $item) {
            return null;
        }

        $snippet = $item['snippet'] ?? [];
        $stats = $item['statistics'] ?? [];
        $publishedAt = $snippet['publishedAt'] ?? '';
        $thumb = $this->bestThumbnail($snippet['thumbnails'] ?? []);
        if ($thumb === '') {
            $thumb = 'https://img.youtube.com/vi/' . $videoId . '/mqdefault.jpg';
        }

        $likeCount = (int) ($stats['likeCount'] ?? 0);
        $commentCount = (int) ($stats['commentCount'] ?? 0);

        return [
            'id' => $videoId,
            'title' => $snippet['title'] ?? 'Video',
            'description' => $snippet['description'] ?? '',
            'channel_title' => $snippet['channelTitle'] ?? '',
            'channel_id' => $snippet['channelId'] ?? '',
            'thumbnail_url' => $thumb,
            'published_at' => $publishedAt,
            'time_ago' => $publishedAt ? \Carbon\Carbon::parse($publishedAt)->diffForHumans() : '',
            'views' => (int) ($stats['viewCount'] ?? 0),
            'views_formatted' => number_format((int) ($stats['viewCount'] ?? 0)),
            'likes' => $likeCount,
            'likes_formatted' => number_format($likeCount),
            'comment_count' => $commentCount,
            'comment_count_formatted' => number_format($commentCount),
            'duration' => $this->formatIsoDuration($item['contentDetails']['duration'] ?? 'PT0S'),
        ];
    }

    /**
     * Get top-level comments for a video. Cached 15 minutes.
     * Returns empty array if comments disabled, API error, or no key.
     *
     * @return array<int, array{authorDisplayName: string, authorProfileImageUrl: string, text: string, likeCount: int, publishedAt: string, time_ago: string}>
     */
    public function getVideoComments(string $videoId, int $maxResults = 30): array
    {
        if (empty($this->apiKey)) {
            return [];
        }

        $cacheKey = 'youtube_video_comments_' . $videoId . '_' . $maxResults;

        return Cache::remember($cacheKey, 900, function () use ($videoId, $maxResults) {
            $response = $this->http()->get($this->baseUrl . '/commentThreads', [
                'part' => 'snippet',
                'videoId' => $videoId,
                'maxResults' => min(max(1, $maxResults), 100),
                'order' => 'relevance',
                'textFormat' => 'plainText',
                'key' => $this->apiKey,
            ]);

            if (! $response->successful()) {
                if ($response->status() === 403) {
                    Log::debug('YouTube comments disabled or unavailable for video: ' . $videoId);
                }

                return [];
            }

            $data = $response->json();
            $items = $data['items'] ?? [];
            $out = [];
            foreach ($items as $item) {
                $top = $item['snippet']['topLevelComment']['snippet'] ?? null;
                if (! $top) {
                    continue;
                }
                $publishedAt = $top['publishedAt'] ?? '';
                $out[] = [
                    'authorDisplayName' => $top['authorDisplayName'] ?? 'Unknown',
                    'authorProfileImageUrl' => $top['authorProfileImageUrl'] ?? '',
                    'text' => $top['textDisplay'] ?? $top['textOriginal'] ?? '',
                    'likeCount' => (int) ($top['likeCount'] ?? 0),
                    'publishedAt' => $publishedAt,
                    'time_ago' => $publishedAt ? \Carbon\Carbon::parse($publishedAt)->diffForHumans() : '',
                ];
            }

            return $out;
        });
    }

    /**
     * @param  array<string>  $videoIds
     * @return array<string, array{viewCount: string, duration: string}>
     */
    private function fetchVideosDetails(array $videoIds): array
    {
        $response = $this->http()->get($this->baseUrl . '/videos', [
            'part' => 'statistics,contentDetails',
            'id' => implode(',', $videoIds),
            'key' => $this->apiKey,
        ]);

        if (! $response->successful()) {
            return [];
        }

        $data = $response->json();
        $items = $data['items'] ?? [];
        $result = [];
        foreach ($items as $item) {
            $id = $item['id'] ?? null;
            if ($id) {
                $stats = $item['statistics'] ?? [];
                $likeCount = (int) ($stats['likeCount'] ?? 0);
                $commentCount = (int) ($stats['commentCount'] ?? 0);
                $result[$id] = [
                    'viewCount' => $item['statistics']['viewCount'] ?? 0,
                    'duration' => $item['contentDetails']['duration'] ?? 'PT0S',
                    'likeCount' => $likeCount,
                    'likes_formatted' => number_format($likeCount),
                    'commentCount' => $commentCount,
                    'comment_count_formatted' => number_format($commentCount),
                ];
            }
        }

        return $result;
    }

    private function bestThumbnail(array $thumbnails): string
    {
        foreach (['maxres', 'standard', 'high', 'medium', 'default'] as $key) {
            if (! empty($thumbnails[$key]['url'])) {
                return $thumbnails[$key]['url'];
            }
        }

        return '';
    }

    private function formatIsoDuration(string $iso): string
    {
        try {
            $interval = new \DateInterval($iso);
            if ($interval->h > 0) {
                return sprintf('%d:%02d:%02d', $interval->h, $interval->i, $interval->s);
            }

            return sprintf('%d:%02d', $interval->i, $interval->s);
        } catch (\Exception $e) {
            return '0:00';
        }
    }

    /**
     * Return a valid YouTube OAuth access token for the organization.
     * Uses existing token if not expired (with 5 min buffer); otherwise refreshes using refresh_token and saves.
     *
     * @return string|null Access token or null if missing/expired and refresh failed
     */
    public function getValidAccessToken(Organization $organization): ?string
    {
        $expiresAt = $organization->youtube_token_expires_at;
        $bufferMinutes = 5;
        if ($expiresAt && $expiresAt->copy()->subMinutes($bufferMinutes)->isFuture()) {
            try {
                return Crypt::decryptString($organization->youtube_access_token);
            } catch (\Exception $e) {
                Log::warning('YouTube access token decrypt failed, will try refresh', ['org_id' => $organization->id]);
            }
        }

        return $this->refreshYoutubeToken($organization);
    }

    /**
     * Refresh YouTube OAuth access token using the organization's refresh_token and persist to DB.
     *
     * @return string|null New access token or null on failure
     */
    public function refreshYoutubeToken(Organization $organization): ?string
    {
        $refreshToken = $organization->youtube_refresh_token;
        if (empty($refreshToken)) {
            Log::warning('YouTube refresh token missing', ['organization_id' => $organization->id]);

            return null;
        }

        try {
            $decryptedRefresh = Crypt::decryptString($refreshToken);
        } catch (\Exception $e) {
            Log::warning('YouTube refresh token decrypt failed', ['organization_id' => $organization->id]);

            return null;
        }

        $clientId = config('services.youtube.client_id');
        $clientSecret = config('services.youtube.client_secret');
        if (empty($clientId) || empty($clientSecret)) {
            Log::warning('YouTube OAuth client not configured');

            return null;
        }

        $response = $this->http()->asForm()->post('https://oauth2.googleapis.com/token', [
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'refresh_token' => $decryptedRefresh,
            'grant_type' => 'refresh_token',
        ]);

        if (! $response->successful()) {
            Log::error('YouTube token refresh failed', [
                'organization_id' => $organization->id,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return null;
        }

        $data = $response->json();
        $accessToken = $data['access_token'] ?? null;
        $expiresIn = (int) ($data['expires_in'] ?? 3600);
        if (! $accessToken) {
            return null;
        }

        $organization->update([
            'youtube_access_token' => Crypt::encryptString($accessToken),
            'youtube_token_expires_at' => now()->addSeconds($expiresIn),
        ]);

        return $accessToken;
    }

    /**
     * Create a YouTube live broadcast using OAuth token.
     * Requires: youtube.force-ssl scope
     *
     * @param string $accessToken OAuth access token
     * @param string $title Broadcast title
     * @param string|null $description Broadcast description
     * @param \DateTime|null $scheduledStartTime When to start (null = start immediately)
     * @return array{broadcast_id: string, stream_key: string, rtmp_url: string}|null
     */
    public function createLiveBroadcast(
        string $accessToken,
        string $title,
        ?string $description = null,
        ?\DateTime $scheduledStartTime = null
    ): ?array {
        try {
            // YouTube API requires scheduledStartTime for every broadcast. Use "now" when starting immediately.
            $startTime = $scheduledStartTime ?? new \DateTime('now', new \DateTimeZone('UTC'));
            $scheduledStartTimeIso = $startTime->format('Y-m-d\TH:i:s\Z');

            // Step 1: Create the broadcast
            $broadcastData = [
                'snippet' => [
                    'title' => $title,
                    'description' => $description ?? '',
                    'scheduledStartTime' => $scheduledStartTimeIso,
                ],
                'status' => [
                    'privacyStatus' => 'public', // or 'unlisted', 'private'
                    'selfDeclaredMadeForKids' => false,
                ],
                'contentDetails' => [
                    'enableAutoStart' => $scheduledStartTime === null,
                    'enableAutoStop' => false,
                ],
            ];

            $broadcastResponse = $this->http()
                ->withToken($accessToken)
                ->asJson()
                ->post($this->baseUrl . '/liveBroadcasts?part=snippet,status,contentDetails&key=' . $this->apiKey, $broadcastData);

            if (!$broadcastResponse->successful()) {
                Log::error('YouTube broadcast creation failed', [
                    'status' => $broadcastResponse->status(),
                    'body' => $broadcastResponse->body(),
                ]);
                return null;
            }

            $broadcast = $broadcastResponse->json();
            $broadcastId = $broadcast['id'] ?? null;

            if (!$broadcastId) {
                Log::error('YouTube broadcast ID missing in response', ['response' => $broadcast]);
                return null;
            }

            // Step 2: Create the stream (API requires cdn.resolution and cdn.frameRate; cdn.format is deprecated)
            $streamData = [
                'snippet' => [
                    'title' => $title . ' Stream',
                ],
                'cdn' => [
                    'ingestionType' => 'rtmp',
                    'resolution' => '1080p',
                    'frameRate' => '30fps',
                ],
            ];

            $streamResponse = $this->http()
                ->withToken($accessToken)
                ->asJson()
                ->post($this->baseUrl . '/liveStreams?part=snippet,cdn&key=' . $this->apiKey, $streamData);

            if (!$streamResponse->successful()) {
                Log::error('YouTube stream creation failed', [
                    'status' => $streamResponse->status(),
                    'body' => $streamResponse->body(),
                ]);
                // Try to delete the broadcast we created
                $this->http()
                    ->withToken($accessToken)
                    ->delete($this->baseUrl . '/liveBroadcasts', [
                        'id' => $broadcastId,
                        'key' => $this->apiKey,
                    ]);
                return null;
            }

            $stream = $streamResponse->json();
            $streamId = $stream['id'] ?? null;
            $streamKey = $stream['cdn']['ingestionInfo']['streamName'] ?? null;
            $rtmpUrl = $stream['cdn']['ingestionInfo']['ingestionAddress'] ?? null;

            if (!$streamId || !$streamKey || !$rtmpUrl) {
                Log::error('YouTube stream data incomplete', ['response' => $stream]);
                return null;
            }

            // Step 3: Bind the stream to the broadcast (id, streamId, part, key are query params; no body)
            $bindUrl = $this->baseUrl . '/liveBroadcasts/bind?' . http_build_query([
                'id' => $broadcastId,
                'streamId' => $streamId,
                'part' => 'id,snippet,contentDetails,status',
                'key' => $this->apiKey,
            ]);
            $bindResponse = $this->http()
                ->withToken($accessToken)
                ->post($bindUrl);

            if (!$bindResponse->successful()) {
                Log::error('YouTube broadcast bind failed', [
                    'status' => $bindResponse->status(),
                    'body' => $bindResponse->body(),
                ]);
                return null;
            }

            return [
                'broadcast_id' => $broadcastId,
                'stream_key' => $streamKey,
                'rtmp_url' => $rtmpUrl,
                'stream_id' => $streamId,
            ];
        } catch (\Exception $e) {
            Log::error('YouTube broadcast creation exception', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return null;
        }
    }

    /**
     * Get stream key for an existing broadcast.
     *
     * @param string $accessToken OAuth access token
     * @param string $broadcastId YouTube broadcast ID
     * @return array{stream_key: string, rtmp_url: string}|null
     */
    public function getBroadcastStreamKey(string $accessToken, string $broadcastId): ?array
    {
        try {
            $response = $this->http()
                ->withToken($accessToken)
                ->get($this->baseUrl . '/liveBroadcasts', [
                    'id' => $broadcastId,
                    'part' => 'contentDetails',
                    'key' => $this->apiKey,
                ]);

            if (!$response->successful()) {
                Log::error('YouTube broadcast fetch failed', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                return null;
            }

            $data = $response->json();
            $items = $data['items'] ?? [];
            if (empty($items)) {
                return null;
            }

            $streamId = $items[0]['contentDetails']['boundStreamId'] ?? null;
            if (!$streamId) {
                return null;
            }

            // Get stream details
            $streamResponse = $this->http()
                ->withToken($accessToken)
                ->get($this->baseUrl . '/liveStreams', [
                    'id' => $streamId,
                    'part' => 'cdn',
                    'key' => $this->apiKey,
                ]);

            if (!$streamResponse->successful()) {
                return null;
            }

            $streamData = $streamResponse->json();
            $streams = $streamData['items'] ?? [];
            if (empty($streams)) {
                return null;
            }

            $cdn = $streams[0]['cdn']['ingestionInfo'] ?? [];
            $streamKey = $cdn['streamName'] ?? null;
            $rtmpUrl = $cdn['ingestionAddress'] ?? null;

            if (!$streamKey || !$rtmpUrl) {
                return null;
            }

            return [
                'stream_key' => $streamKey,
                'rtmp_url' => $rtmpUrl,
            ];
        } catch (\Exception $e) {
            Log::error('YouTube stream key fetch exception', [
                'message' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * Check if the stream bound to this broadcast is active (YouTube is receiving RTMP data).
     * Transition to "live" only succeeds when stream status is "active".
     *
     * @return array{stream_active: bool, stream_status: string|null, life_cycle_status: string|null}
     */
    public function getBroadcastStreamStatus(string $accessToken, string $broadcastId): array
    {
        $out = ['stream_active' => false, 'stream_status' => null, 'life_cycle_status' => null];
        try {
            $br = $this->http()
                ->withHeaders(['Authorization' => 'Bearer ' . $accessToken])
                ->get($this->baseUrl . '/liveBroadcasts', [
                    'id' => $broadcastId,
                    'part' => 'contentDetails,status',
                    'key' => $this->apiKey,
                ]);
            if (! $br->successful()) {
                return $out;
            }
            $data = $br->json();
            $items = $data['items'] ?? [];
            if (empty($items)) {
                return $out;
            }
            $out['life_cycle_status'] = $items[0]['status']['lifeCycleStatus'] ?? null;
            $streamId = $items[0]['contentDetails']['boundStreamId'] ?? null;
            if (! $streamId) {
                return $out;
            }
            $sr = $this->http()
                ->withHeaders(['Authorization' => 'Bearer ' . $accessToken])
                ->get($this->baseUrl . '/liveStreams', [
                    'id' => $streamId,
                    'part' => 'status',
                    'key' => $this->apiKey,
                ]);
            if (! $sr->successful()) {
                return $out;
            }
            $streamData = $sr->json();
            $streams = $streamData['items'] ?? [];
            if (empty($streams)) {
                return $out;
            }
            $out['stream_status'] = $streams[0]['status']['streamStatus'] ?? null;
            $out['stream_active'] = ($out['stream_status'] === 'active');
            return $out;
        } catch (\Exception $e) {
            Log::warning('YouTube broadcast/stream status check failed', ['message' => $e->getMessage()]);
            return $out;
        }
    }

    /**
     * Update broadcast status (transition to live, end, etc.).
     *
     * @param string $accessToken OAuth access token
     * @param string $broadcastId YouTube broadcast ID
     * @param string $broadcastStatus 'testing', 'live', 'complete'
     * @return bool
     */
    public function updateBroadcastStatus(string $accessToken, string $broadcastId, string $broadcastStatus): bool
    {
        try {
            if (empty($accessToken)) {
                Log::warning('YouTube transition skipped: empty access token');
                return false;
            }

            // YouTube API requires transition params as query string; no request body. Auth via Bearer token.
            $query = http_build_query([
                'id' => $broadcastId,
                'broadcastStatus' => $broadcastStatus,
                'part' => 'id,snippet,contentDetails,status',
                'key' => $this->apiKey,
            ]);
            $url = $this->baseUrl . '/liveBroadcasts/transition?' . $query;

            $response = $this->http()
                ->withHeaders(['Authorization' => 'Bearer ' . $accessToken])
                ->post($url);

            if (! $response->successful()) {
                Log::warning('YouTube transition failed', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
            }

            return $response->successful();
        } catch (\Exception $e) {
            Log::error('YouTube broadcast status update exception', [
                'message' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Delete a YouTube broadcast.
     *
     * @param string $accessToken OAuth access token
     * @param string $broadcastId YouTube broadcast ID
     * @return bool
     */
    public function deleteBroadcast(string $accessToken, string $broadcastId): bool
    {
        try {
            $url = $this->baseUrl . '/liveBroadcasts?' . http_build_query([
                'id' => $broadcastId,
                'key' => $this->apiKey,
            ]);
            $response = $this->http()
                ->withToken($accessToken)
                ->delete($url);

            return $response->successful();
        } catch (\Exception $e) {
            Log::error('YouTube broadcast deletion exception', [
                'message' => $e->getMessage(),
            ]);
            return false;
        }
    }
}
