<?php
declare(strict_types=1);

namespace App\Services\Rss;

use App\DTO\FeedItem;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

final class FeedFetcher
{
    public function __construct(
        private readonly string $userAgent,
        private readonly int $timeout,
        private readonly int $connectTimeout,
        private readonly bool $respectEtag,
        private readonly int $perFeedLimit
    ) {
    }

    /**
     * @return FeedItem[]
     */
    public function fetch(string $sourceName, string $url): array
    {
        if (class_exists(\SimplePie\SimplePie::class)) {
            return $this->fetchWithSimplePie($sourceName, $url);
        }
        return $this->fetchWithFallback($sourceName, $url);
    }

    /** ---------- SimplePie path (robust) ---------- */
    private function fetchWithSimplePie(string $source, string $url): array
    {
        $feed = new \SimplePie\SimplePie();
        $feed->set_feed_url($url);
        $feed->set_useragent($this->userAgent);
        $feed->enable_cache(false); // Laravel cache handles result
        $this->applyConditionals($url, $feed);
        $feed->init();

        $out = [];
        $count = 0;

        foreach ($feed->get_items() ?? [] as $item) {
            if ($count++ >= $this->perFeedLimit)
                break;

            $dateU = $item->get_date('U');
            $summary = $item->get_description() ?: $item->get_content();

            $out[] = new FeedItem(
                title: Str::of((string) ($item->get_title() ?: '(no title)'))->trim()->value(),
                link: (string) ($item->get_link() ?: $url),
                source: $source,
                publishedAt: $dateU ? CarbonImmutable::createFromTimestampUTC((int) $dateU) : null,
                summary: $summary ? Str::of(strip_tags($summary))->squish()->value() : null,
            );
        }

        $this->persistConditionals($url, $feed->get_permalink(), $feed);

        return $out;
    }

    private function applyConditionals(string $key, \SimplePie\SimplePie $feed): void
    {
        if (!$this->respectEtag)
            return;

        $meta = Cache::get($this->etagKey($key));
        if (!$meta)
            return;

        $headers = [];
        if (!empty($meta['etag']))
            $headers['If-None-Match'] = $meta['etag'];
        if (!empty($meta['last_modified']))
            $headers['If-Modified-Since'] = $meta['last_modified'];

        // SimplePie doesn't expose header injection directly; we’ll rely on HTTP fallback for ETag,
        // but we still remember/persist conditionals for symmetry.
    }

    private function persistConditionals(string $key, ?string $permalink, \SimplePie\SimplePie $feed): void
    {
        if (!$this->respectEtag)
            return;

        // SimplePie does not expose response headers; we can't record ETag here.
        // We still normalize key in case we switch engines later.
        Cache::put($this->etagKey($key), [
            'etag' => null,
            'last_modified' => null,
            'permalink' => $permalink,
        ], now()->addHours(6));
    }

    /** ---------- Pure-PHP fallback (RSS/Atom basic) ---------- */
    private function fetchWithFallback(string $source, string $url): array
    {
        $headers = [
            'User-Agent' => $this->userAgent,
            'Accept' => 'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5',
        ];

        if ($this->respectEtag) {
            $meta = Cache::get($this->etagKey($url));
            if (!empty($meta['etag']))
                $headers['If-None-Match'] = $meta['etag'];
            if (!empty($meta['last_modified']))
                $headers['If-Modified-Since'] = $meta['last_modified'];
        }

        $resp = Http::withHeaders($headers)
            ->timeout($this->timeout)
            ->connectTimeout($this->connectTimeout)
            ->retry(2, 300) // small backoff
            ->get($url);

        if ($resp->status() === 304) {
            // Not modified; return empty — aggregator will use cached merge.
            return [];
        }

        $resp->throw();

        $etag = $resp->header('ETag');
        $lastMod = $resp->header('Last-Modified');

        if ($this->respectEtag) {
            Cache::put($this->etagKey($url), [
                'etag' => $etag,
                'last_modified' => $lastMod,
            ], now()->addHours(6));
        }

        libxml_use_internal_errors(true);
        $xml = simplexml_load_string($resp->body());
        if (!$xml) {
            throw new \RuntimeException('XML parse error');
        }

        $items = [];

        // RSS?
        if (isset($xml->channel)) {
            $list = $xml->channel->item ?? [];
            $i = 0;
            foreach ($list as $it) {
                if ($i++ >= $this->perFeedLimit)
                    break;

                $title = (string) ($it->title ?? '(no title)');
                $link = (string) ($it->link ?? $url);
                $dateStr = (string) ($it->pubDate ?? '');
                $desc = (string) ($it->description ?? '');

                $items[] = new FeedItem(
                    title: Str::of($title)->trim()->value() ?: '(no title)',
                    link: $link,
                    source: $source,
                    publishedAt: $this->parseDate($dateStr),
                    summary: $desc ? Str::of(strip_tags($desc))->squish()->value() : null
                );
            }

            return $items;
        }

        // Atom?
        $entries = $xml->entry ?? [];
        $i = 0;
        foreach ($entries as $entry) {
            if ($i++ >= $this->perFeedLimit)
                break;

            $title = (string) ($entry->title ?? '(no title)');

            $link = '';
            if (isset($entry->link)) {
                foreach ($entry->link as $l) {
                    $attrs = $l->attributes();
                    if (!empty($attrs['rel']) && (string) $attrs['rel'] === 'alternate' && !empty($attrs['href'])) {
                        $link = (string) $attrs['href'];
                        break;
                    }
                    if (!$link && !empty($attrs['href'])) {
                        $link = (string) $attrs['href'];
                    }
                }
            }

            $dateStr = (string) ($entry->updated ?? $entry->published ?? '');
            $summaryNode = $entry->summary ?? $entry->content ?? null;
            $summary = $summaryNode ? (string) $summaryNode : null;

            $items[] = new FeedItem(
                title: Str::of($title)->trim()->value() ?: '(no title)',
                link: $link ?: $url,
                source: $source,
                publishedAt: $this->parseDate($dateStr),
                summary: $summary ? Str::of(strip_tags($summary))->squish()->value() : null
            );
        }

        return $items;
    }

    private function parseDate(?string $raw): ?CarbonImmutable
    {
        if (!$raw)
            return null;
        try {
            return CarbonImmutable::parse($raw)->utc();
        } catch (\Throwable) {
            return null;
        }
    }

    private function etagKey(string $url): string
    {
        return 'rss:etag:' . sha1($url);
    }
}
