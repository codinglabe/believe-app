<?php

return [
    // Add/remove sources freely.
    'nonprofit_feeds' => [
        'TechSoup' => 'https://blog.techsoup.org/posts/rss.xml',
        'Candid Blog' => 'https://blog.candid.org/feed/',
        'NonProfit PRO' => 'https://www.nonprofitpro.com/feed/',
        'Nonprofit Quarterly' => 'https://nonprofitquarterly.org/feed/',
        'Nonprofit AF' => 'https://nonprofitaf.com/feed/',
        'SSIR' => 'https://ssir.org/site/rss_2.0',
        'Nonprofit Hub' => 'https://nonprofithub.org/feed/',
        'Nonprofit Tech for Good' => 'https://www.nptechforgood.com/feed/',
    ],

    // Caching / limits (cache no longer used; articles stored in DB)
    'cache_key' => 'nonprofit_rss_cache_v2',
    'cache_ttl_seconds' => 1800,
    'per_feed_limit' => 30,                   // items per feed to fetch and store each run
    'merged_limit' => 60,

    // HTTP / fetch
    'user_agent' => env('APP_URL', 'http://127.0.0.1:8000'),
    'timeout' => 12,                 // seconds
    'connect_timeout' => 5,                  // seconds
    'concurrency' => 8,                  // Http::pool size
    'respect_etag' => true,               // send If-None-Match / If-Modified-Since
];
