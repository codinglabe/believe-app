<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use App\Services\RssAggregator;

class WarmNonprofitRss extends Command
{
    protected $signature = 'rss:warm-nonprofit';
    protected $description = 'Warm cache for nonprofit RSS aggregator';

    public function handle()
    {
        $feeds = config('rss.nonprofit_feeds', []);
        $perFeed = (int) config('rss.per_feed_limit', 10);
        $cacheKey = config('rss.cache_key', 'nonprofit_rss_cache');
        $ttl = (int) config('rss.cache_ttl_seconds', 1800);

        $agg = new RssAggregator($feeds, $perFeed);
        $items = $agg->aggregate();
        Cache::put($cacheKey, $items, $ttl);

        $this->info('Nonprofit RSS cache warmed with ' . count($items) . ' items.');
        return self::SUCCESS;
    }
}
