<?php

namespace App\Services\Facebook;

use App\Models\FacebookAccount;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Read Page-published content (posts/photos metadata) via pages_read_engagement.
 * Intentionally excludes likes, reactions, comments counts, shares, and insights/views.
 */
class PageContentService
{
    private string $apiVersion;

    public function __construct()
    {
        $this->apiVersion = config('facebook.api_version', 'v21.0');
    }

    /**
     * @return array{posts: array<int, array{id: string, message: string, created_time: ?string, permalink_url: ?string, picture: ?string}>, fetched_at: string}
     */
    public function getRecentPagePosts(FacebookAccount $account, int $limit = 5): array
    {
        if (empty($account->page_access_token) || empty($account->facebook_page_id)) {
            throw new \InvalidArgumentException('Facebook Page is not connected.');
        }

        $limit = max(1, min($limit, 10));

        $response = Http::timeout(20)->get(
            "https://graph.facebook.com/{$this->apiVersion}/{$account->facebook_page_id}/published_posts",
            [
                'access_token' => $account->page_access_token,
                // Content + metadata only — no reactions, comments, shares, or insights.
                'fields' => 'id,message,story,created_time,permalink_url,full_picture',
                'limit' => $limit,
            ]
        );

        if (! $response->successful()) {
            $body = $response->json();
            $message = is_array($body) && isset($body['error']['message'])
                ? (string) $body['error']['message']
                : $response->body();

            Log::warning('Facebook published_posts read failed', [
                'page_id' => $account->facebook_page_id,
                'status' => $response->status(),
                'error' => $message,
            ]);

            throw new \Exception('Failed to read Page content from Facebook: '.$message);
        }

        $rows = $response->json('data') ?? [];
        $posts = [];

        foreach ($rows as $row) {
            if (! is_array($row) || empty($row['id'])) {
                continue;
            }

            $message = trim((string) ($row['message'] ?? $row['story'] ?? ''));
            if ($message === '') {
                $message = '(Media or story post — no text caption)';
            }

            $posts[] = [
                'id' => (string) $row['id'],
                'message' => $message,
                'created_time' => isset($row['created_time']) ? (string) $row['created_time'] : null,
                'permalink_url' => isset($row['permalink_url']) ? (string) $row['permalink_url'] : null,
                'picture' => isset($row['full_picture']) ? (string) $row['full_picture'] : null,
            ];
        }

        return [
            'posts' => $posts,
            'fetched_at' => now()->toIso8601String(),
        ];
    }
}
