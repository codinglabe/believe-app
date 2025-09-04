<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Illuminate\Http\Request;
use App\Services\RssAggregator;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Pagination\Paginator;

class NonprofitNewsController extends Controller
{
    public function index(Request $request)
    {
        $feeds = config('rss.nonprofit_feeds', []);
        $perFeed = (int) config('rss.per_feed_limit', 10);
        $cacheKey = config('rss.cache_key', 'nonprofit_rss_cache');
        $ttl = (int) config('rss.cache_ttl_seconds', 1800);
        $mergedLimit = (int) config('rss.merged_limit', 60);

        $items = Cache::remember($cacheKey, $ttl, function () use ($feeds, $perFeed) {
            $agg = new RssAggregator($feeds, $perFeed);
            return $agg->aggregate();
        });

        // Apply search filter
        if ($q = trim((string) $request->query('q'))) {
            $items = array_values(array_filter($items, function ($it) use ($q) {
                return stripos($it['title'], $q) !== false
                    || ($it['summary'] && stripos($it['summary'], $q) !== false)
                    || stripos($it['source'], $q) !== false;
            }));
        }

        // Apply source filter
        $selectedSources = $request->query('sources', []);
        if (!empty($selectedSources)) {
            $items = array_values(array_filter($items, function ($it) use ($selectedSources) {
                return in_array($it['source'], $selectedSources);
            }));
        }

        // Get the page from the request, default to 1
        $page = $request->query('page', 1);
        $perPage = 15; // Number of items per page

        // Create a paginator instance
        $paginator = new LengthAwarePaginator(
            array_slice($items, ($page - 1) * $perPage, $perPage),
            count($items),
            $perPage,
            $page,
            [
                'path' => $request->url(),
                'query' => $request->query(),
            ]
        );

        return Inertia::render('frontend/news/index', [
            'items' => $paginator->items(),
            'allSources' => array_keys($feeds),
            'sources' => $selectedSources,
            'query' => $q ?? '',
            'updated_at' => now()->toIso8601String(),
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'from' => $paginator->firstItem() ?? 0,
            'to' => $paginator->lastItem() ?? 0,
            'total' => $paginator->total(),
        ]);
    }
}
