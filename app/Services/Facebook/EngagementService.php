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
        $metrics = [
            'page_post_engagements' => 'Post engagements (28 days)',
            'page_impressions' => 'Page impressions (28 days)',
            'page_engaged_users' => 'Engaged users (28 days)',
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
     * @return array{metrics: array<int, array{label: string, value: string|int}>, fetched_at: string}
     */
    public function getPostEngagement(FacebookAccount $account, FacebookPost $post): array
    {
        if (! $post->facebook_post_id) {
            throw new \InvalidArgumentException('Post is not published on Facebook yet.');
        }

        $postId = $post->facebook_post_id;
        $insightMetrics = [
            'post_impressions' => 'Impressions',
            'post_engaged_users' => 'Engaged users',
            'post_reactions_by_type_total' => 'Reactions',
        ];

        $url = "https://graph.facebook.com/{$this->apiVersion}/{$postId}/insights";
        $response = Http::get($url, [
            'access_token' => $account->page_access_token,
            'metric' => implode(',', array_keys($insightMetrics)),
        ]);

        if (! $response->successful()) {
            throw new \Exception('Failed to load post engagement: '.$response->body());
        }

        $data = $response->json('data', []);
        $byName = collect($data)->keyBy('name');

        $results = [];
        foreach ($insightMetrics as $key => $label) {
            $entry = $byName->get($key);
            $value = $this->formatInsightEntry($entry);
            $results[] = [
                'key' => $key,
                'label' => $label,
                'value' => $value,
            ];
        }

        // Comments / shares counts from post object (also requires pages_read_engagement)
        $postFields = Http::get("https://graph.facebook.com/{$this->apiVersion}/{$postId}", [
            'access_token' => $account->page_access_token,
            'fields' => 'comments.summary(true),shares',
        ]);

        if ($postFields->successful()) {
            $body = $postFields->json();
            $results[] = [
                'key' => 'comments',
                'label' => 'Comments',
                'value' => (string) ($body['comments']['summary']['total_count'] ?? 0),
            ];
            $results[] = [
                'key' => 'shares',
                'label' => 'Shares',
                'value' => (string) ($body['shares']['count'] ?? 0),
            ];
        }

        return [
            'metrics' => $results,
            'fetched_at' => now()->toIso8601String(),
        ];
    }

    private function fetchInsightValue(FacebookAccount $account, string $metric, string $period): ?string
    {
        $url = "https://graph.facebook.com/{$this->apiVersion}/{$account->facebook_page_id}/insights/{$metric}";
        $response = Http::get($url, [
            'access_token' => $account->page_access_token,
            'period' => $period,
        ]);

        if (! $response->successful()) {
            throw new \Exception($response->body());
        }

        $entry = $response->json('data.0');

        return $this->formatInsightEntry($entry);
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
            return (string) array_sum($raw);
        }

        return (string) ($raw ?? '—');
    }
}
