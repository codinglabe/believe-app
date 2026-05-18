<?php

namespace App\Console\Commands;

use App\Models\NonprofitNewsArticle;
use App\Services\RssAggregator;
use Carbon\Carbon;
use Illuminate\Console\Command;

class WarmNonprofitRss extends Command
{
    protected $signature = 'rss:warm-nonprofit
                            {--limit= : Max items per feed (default from config)}';
    protected $description = 'Fetch nonprofit RSS feeds and store articles in the database (and warm cache)';

    public function handle(): int
    {
        $feeds = config('rss.nonprofit_feeds', []);
        $perFeed = (int) ($this->option('limit') ?? config('rss.per_feed_limit', 30));
        $perFeed = max(10, min(100, $perFeed));

        $agg = new RssAggregator($feeds, $perFeed);
        $items = $agg->aggregate();

        $created = 0;
        $updated = 0;

        foreach ($items as $item) {
            $linkHash = hash('sha256', ($item['source'] ?? '') . '|' . ($item['link'] ?? ''));
            $publishedAt = isset($item['published_at']) && $item['published_at'] instanceof \DateTimeInterface
                ? Carbon::instance($item['published_at'])
                : null;

            $article = NonprofitNewsArticle::query()
                ->where('source', $item['source'] ?? '')
                ->where('link_hash', $linkHash)
                ->first();

            $payload = [
                'title' => $item['title'] ?? '(no title)',
                'link' => $item['link'] ?? '',
                'summary' => $item['summary'] ?? null,
                'published_at' => $publishedAt,
                'image_url' => $item['image_url'] ?? null,
            ];

            if ($article) {
                $article->update($payload);
                $updated++;
            } else {
                NonprofitNewsArticle::create(array_merge($payload, [
                    'source' => $item['source'] ?? '',
                    'link_hash' => $linkHash,
                ]));
                $created++;
            }
        }

        $this->info(sprintf(
            'Nonprofit news: %d created, %d updated, %d total from RSS.',
            $created,
            $updated,
            count($items)
        ));

        return self::SUCCESS;
    }
}
