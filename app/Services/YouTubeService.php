<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
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

            $bannerUrl = $item['brandingSettings']['image']['bannerExternalUrl'] ?? null;
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
}
