<?php

namespace App\Services\Facebook;

use App\Models\FacebookAccount;
use App\Models\FacebookPost;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class EngagementService
{
    private string $apiVersion;

    public function __construct()
    {
        $this->apiVersion = config('facebook.api_version', 'v21.0');
    }

    /**
     * Summary metrics for a connected Page (pages_read_engagement).
     *
     * @return array{metrics: array<int, array{label: string, value: string|int, description: string}>, fetched_at: string}
     */
    public function getPageEngagementSummary(FacebookAccount $account): array
    {
        // Meta deprecated page_impressions, page_engaged_users, page_post_engagements (see platforminsights/page/deprecated-metrics).
        $metrics = [
            'page_media_view' => 'Content views (28 days)',
            'page_total_media_view_unique' => 'Unique viewers (28 days)',
            'page_follows' => 'Page follows',
        ];

        $results = [];

        foreach ($metrics as $metric => $label) {
            try {
                $value = $this->fetchInsightValue($account, $metric, 'days_28');
                $results[] = [
                    'key' => $metric,
                    'label' => $label,
                    'value' => $value ?? '—',
                    'description' => 'Read from Facebook Page Insights using pages_read_engagement.',
                ];
            } catch (\Throwable $e) {
                Log::warning('Facebook page insight failed', [
                    'metric' => $metric,
                    'page_id' => $account->facebook_page_id,
                    'error' => $e->getMessage(),
                ]);
                $results[] = [
                    'key' => $metric,
                    'label' => $label,
                    'value' => '—',
                    'description' => 'Insight unavailable for this page or period.',
                ];
            }
        }

        return [
            'metrics' => $results,
            'fetched_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Post-level engagement for a published post (pages_read_engagement).
     *
     * Reactions / comments / shares come from the post object (reliable with a Page token).
     * Views come from post insights when Meta returns them (often delayed or empty for text-only posts).
     *
     * @return array{metrics: array<int, array{label: string, value: string|int}>, fetched_at: string, warning?: string}
     */
    public function getPostEngagement(FacebookAccount $account, FacebookPost $post): array
    {
        if (! $post->facebook_post_id) {
            throw new \InvalidArgumentException('Post is not published on Facebook yet.');
        }

        if (empty($account->page_access_token)) {
            throw new \Exception('Facebook Page access token is missing. Reconnect the Page.');
        }

        $postId = $this->normalizePostId($account, $post->facebook_post_id);
        $results = [];
        $errors = [];

        // Primary source: post object fields (likes/reactions, comments, shares).
        $objectEngagement = $this->fetchPostObjectEngagement($account, $postId);
        if ($objectEngagement['ok']) {
            $results[] = [
                'key' => 'reactions',
                'label' => 'Reactions',
                'value' => (string) $objectEngagement['reactions'],
            ];
            $results[] = [
                'key' => 'comments',
                'label' => 'Comments',
                'value' => (string) $objectEngagement['comments'],
            ];
            $results[] = [
                'key' => 'shares',
                'label' => 'Shares',
                'value' => (string) $objectEngagement['shares'],
            ];
        } else {
            $errors[] = $objectEngagement['error'] ?? 'Could not read post reactions/comments/shares.';
            $results[] = ['key' => 'reactions', 'label' => 'Reactions', 'value' => '—'];
            $results[] = ['key' => 'comments', 'label' => 'Comments', 'value' => '—'];
            $results[] = ['key' => 'shares', 'label' => 'Shares', 'value' => '—'];
        }

        // Best-effort views from insights (may be unavailable for brand-new or text-only posts).
        try {
            $views = $this->fetchPostViews($account, $postId);
            $results[] = [
                'key' => 'views',
                'label' => 'Views',
                'value' => $views ?? '—',
            ];
        } catch (\Throwable $e) {
            Log::warning('Facebook post views insight failed', [
                'post_id' => $postId,
                'error' => $e->getMessage(),
            ]);
            $results[] = [
                'key' => 'views',
                'label' => 'Views',
                'value' => '—',
            ];
            $errors[] = 'Views are not available from Facebook Insights yet for this post.';
        }

        if ($objectEngagement['ok'] === false && $this->isPermissionError($objectEngagement['error'] ?? '')) {
            throw new \Exception(
                'Facebook denied engagement access. Reconnect your Page and ensure pages_read_engagement is granted '
                .'(Advanced Access required when the Meta app is Live). '
                .'Details: '.($objectEngagement['error'] ?? 'permission error')
            );
        }

        if ($results === []) {
            throw new \Exception(
                'Failed to load post engagement: '.implode(' | ', $errors ?: ['no metrics returned from Facebook.'])
            );
        }

        $payload = [
            'metrics' => $results,
            'fetched_at' => now()->toIso8601String(),
        ];

        if ($errors !== [] && $objectEngagement['ok'] === false) {
            $payload['warning'] = implode(' ', $errors);
        }

        return $payload;
    }

    /**
     * Ensure post id is in {page_id}_{post_id} form when possible.
     */
    private function normalizePostId(FacebookAccount $account, string $postId): string
    {
        $postId = trim($postId);
        if ($postId === '') {
            return $postId;
        }

        if (str_contains($postId, '_')) {
            return $postId;
        }

        if (! empty($account->facebook_page_id)) {
            return $account->facebook_page_id.'_'.$postId;
        }

        return $postId;
    }

    /**
     * @return array{ok: bool, reactions?: int, comments?: int, shares?: int, error?: string}
     */
    private function fetchPostObjectEngagement(FacebookAccount $account, string $postId): array
    {
        // Prefer summary(total_count) + limit(0) — Meta's documented pattern for counts only.
        $fieldsAttempts = [
            'reactions.limit(0).summary(total_count),comments.limit(0).summary(total_count),shares',
            'reactions.limit(0).summary(true),comments.limit(0).summary(true),shares',
            'likes.limit(0).summary(true),comments.limit(0).summary(true),shares',
        ];

        $lastError = null;

        foreach ($fieldsAttempts as $fields) {
            try {
                $response = Http::timeout(20)->get(
                    "https://graph.facebook.com/{$this->apiVersion}/{$postId}",
                    [
                        'access_token' => $account->page_access_token,
                        'fields' => $fields,
                    ]
                );

                if (! $response->successful()) {
                    $lastError = $this->extractGraphError($response->json()) ?? $response->body();
                    Log::warning('Facebook post engagement fields failed', [
                        'post_id' => $postId,
                        'fields' => $fields,
                        'status' => $response->status(),
                        'error' => $lastError,
                    ]);

                    continue;
                }

                $body = $response->json() ?? [];
                if (isset($body['error'])) {
                    $lastError = $this->extractGraphError($body) ?? json_encode($body['error']);
                    Log::warning('Facebook post engagement fields returned error', [
                        'post_id' => $postId,
                        'fields' => $fields,
                        'error' => $lastError,
                    ]);

                    continue;
                }

                $reactions = (int) (
                    $body['reactions']['summary']['total_count']
                    ?? $body['likes']['summary']['total_count']
                    ?? 0
                );
                $comments = (int) ($body['comments']['summary']['total_count'] ?? 0);
                $shares = (int) ($body['shares']['count'] ?? 0);

                return [
                    'ok' => true,
                    'reactions' => $reactions,
                    'comments' => $comments,
                    'shares' => $shares,
                ];
            } catch (\Throwable $e) {
                $lastError = $e->getMessage();
                Log::warning('Facebook post engagement fields exception', [
                    'post_id' => $postId,
                    'fields' => $fields,
                    'error' => $lastError,
                ]);
            }
        }

        // Edge fallback: /reactions?summary=total_count (still pages_read_engagement).
        $edge = $this->fetchReactionsEdgeTotal($account, $postId);
        if ($edge['ok']) {
            return [
                'ok' => true,
                'reactions' => $edge['reactions'],
                'comments' => 0,
                'shares' => 0,
            ];
        }

        if (! empty($edge['error'])) {
            $lastError = $edge['error'];
        }

        return [
            'ok' => false,
            'error' => $lastError ?? 'Unknown Facebook engagement error',
        ];
    }

    /**
     * @return array{ok: bool, reactions?: int, error?: string}
     */
    private function fetchReactionsEdgeTotal(FacebookAccount $account, string $postId): array
    {
        try {
            $response = Http::timeout(20)->get(
                "https://graph.facebook.com/{$this->apiVersion}/{$postId}/reactions",
                [
                    'access_token' => $account->page_access_token,
                    'summary' => 'total_count',
                    'limit' => 0,
                ]
            );

            if (! $response->successful()) {
                $error = $this->extractGraphError($response->json()) ?? $response->body();
                Log::warning('Facebook post /reactions edge failed', [
                    'post_id' => $postId,
                    'status' => $response->status(),
                    'error' => $error,
                ]);

                return ['ok' => false, 'error' => $error];
            }

            $body = $response->json() ?? [];
            if (isset($body['error'])) {
                $error = $this->extractGraphError($body) ?? json_encode($body['error']);

                return ['ok' => false, 'error' => $error];
            }

            return [
                'ok' => true,
                'reactions' => (int) ($body['summary']['total_count'] ?? 0),
            ];
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }

    private function fetchPostViews(FacebookAccount $account, string $postId): ?string
    {
        // Prefer current media-view metrics; fall back to legacy impressions while Meta still serves them.
        $candidates = [
            'post_media_view',
            'post_total_media_view_unique',
            'post_impressions',
        ];

        $lastException = null;

        foreach ($candidates as $metric) {
            try {
                $value = $this->fetchPostInsightValue($account, $postId, $metric);
                if ($value !== null && $value !== '—') {
                    return $value;
                }
            } catch (\Throwable $e) {
                $lastException = $e;
                Log::warning('Facebook post insight candidate failed', [
                    'metric' => $metric,
                    'post_id' => $postId,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        if ($lastException) {
            throw $lastException;
        }

        return null;
    }

    private function fetchPostInsightValue(FacebookAccount $account, string $postId, string $metric): ?string
    {
        $url = "https://graph.facebook.com/{$this->apiVersion}/{$postId}/insights";
        $response = Http::timeout(20)->get($url, [
            'access_token' => $account->page_access_token,
            'metric' => $metric,
            'period' => 'lifetime',
        ]);

        if (! $response->successful()) {
            throw new \Exception($this->extractGraphError($response->json()) ?? $response->body());
        }

        $body = $response->json() ?? [];
        if (isset($body['error'])) {
            throw new \Exception($this->extractGraphError($body) ?? json_encode($body['error']));
        }

        return $this->formatInsightEntry($response->json('data.0'));
    }

    private function fetchInsightValue(FacebookAccount $account, string $metric, string $period): ?string
    {
        $url = "https://graph.facebook.com/{$this->apiVersion}/{$account->facebook_page_id}/insights/{$metric}";
        $response = Http::timeout(20)->get($url, [
            'access_token' => $account->page_access_token,
            'period' => $period,
        ]);

        if (! $response->successful()) {
            throw new \Exception($this->extractGraphError($response->json()) ?? $response->body());
        }

        $body = $response->json() ?? [];
        if (isset($body['error'])) {
            throw new \Exception($this->extractGraphError($body) ?? json_encode($body['error']));
        }

        return $this->formatInsightEntry($response->json('data.0'));
    }

    /**
     * @param  array<string, mixed>|null  $entry
     */
    private function formatInsightEntry(?array $entry): string
    {
        if (! $entry) {
            return '—';
        }

        $values = $entry['values'] ?? [];
        if ($values === []) {
            return '—';
        }

        $last = end($values);
        $raw = $last['value'] ?? null;

        if (is_array($raw)) {
            // e.g. post_media_view paid/organic breakdown or reactions-by-type map
            return (string) array_sum(array_map(
                static fn ($v) => is_numeric($v) ? (float) $v : 0,
                $raw
            ));
        }

        return (string) ($raw ?? '—');
    }

    /**
     * @param  array<string, mixed>|null  $body
     */
    private function extractGraphError(?array $body): ?string
    {
        if (! is_array($body) || ! isset($body['error'])) {
            return null;
        }

        $error = $body['error'];
        if (! is_array($error)) {
            return is_string($error) ? $error : null;
        }

        $parts = array_filter([
            isset($error['code']) ? '#'.$error['code'] : null,
            $error['message'] ?? null,
            isset($error['error_subcode']) ? 'subcode '.$error['error_subcode'] : null,
        ]);

        return $parts !== [] ? implode(' ', $parts) : null;
    }

    private function isPermissionError(string $message): bool
    {
        $message = strtolower($message);

        return str_contains($message, '#10')
            || str_contains($message, 'pages_read_engagement')
            || str_contains($message, 'permission')
            || str_contains($message, 'oauthexception')
            || str_contains($message, '(#200)');
    }
}
