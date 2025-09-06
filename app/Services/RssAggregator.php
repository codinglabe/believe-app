<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;

class RssAggregator
{
    protected array $feeds;
    protected int $perFeedLimit;

    public function __construct(array $feeds, int $perFeedLimit = 10)
    {
        $this->feeds = $feeds;
        $this->perFeedLimit = $perFeedLimit;
    }

    public function aggregate(): array
    {
        $all = [];

        foreach ($this->feeds as $sourceName => $url) {
            try {
                $items = $this->fetchFeed($url, $sourceName);
                $all = array_merge($all, $items);
            } catch (\Throwable $e) {
                Log::warning("RSS fetch failed for {$sourceName}: " . $e->getMessage());
            }
        }

        usort($all, function ($a, $b) {
            $ta = $a['published_at'] ? $a['published_at']->getTimestamp() : 0;
            $tb = $b['published_at'] ? $b['published_at']->getTimestamp() : 0;
            return $tb <=> $ta;
        });

        return $all;
    }

    protected function fetchFeed(string $url, string $sourceName): array
    {
        if (class_exists(\SimplePie\SimplePie::class)) {
            return $this->fetchWithSimplePie($url, $sourceName);
        }
        return $this->fetchWithFallback($url, $sourceName);
    }

    protected function fetchWithSimplePie(string $url, string $sourceName): array
    {
        $feed = new \SimplePie\SimplePie();
        $feed->set_feed_url($url);
        $feed->enable_cache(false);
        $feed->init();

        $out = [];
        $count = 0;

        foreach ($feed->get_items() as $item) {
            if ($count >= $this->perFeedLimit) break;
            $count++;

            $date = $item->get_date('U');
            $summary = $item->get_description() ?: $item->get_content();

            $out[] = [
                'title' => trim($item->get_title() ?: '(no title)'),
                'link' => $item->get_link() ?: $url,
                'source' => $sourceName,
                'published_at' => $date ? (new \DateTimeImmutable("@{$date}")) : null,
                'summary' => $summary ? strip_tags($summary) : null,
            ];
        }

        return $out;
    }

    protected function fetchWithFallback(string $url, string $sourceName): array
    {
        $resp = Http::timeout(10)->get($url);
        if (!$resp->ok()) {
            throw new \RuntimeException("HTTP error: " . $resp->status());
        }

        libxml_use_internal_errors(true);
        $xml = simplexml_load_string($resp->body());
        if (!$xml) {
            throw new \RuntimeException("XML parse error");
        }

        $ns = $xml->getNamespaces(true);

        if (isset($xml->channel)) {
            $items = $xml->channel->item ?? [];
            return $this->normalizeRssItems($items, $sourceName);
        } else {
            $entries = $xml->entry ?? [];
            return $this->normalizeAtomEntries($entries, $ns, $sourceName);
        }
    }

    protected function normalizeRssItems($items, string $sourceName): array
    {
        $out = [];
        $count = 0;

        foreach ($items as $it) {
            if ($count >= $this->perFeedLimit) break;
            $count++;

            $title = (string)($it->title ?? '(no title)');
            $link = (string)($it->link ?? '');
            $dateStr = (string)($it->pubDate ?? '');
            $desc = (string)($it->description ?? null);

            $date = $dateStr ? new \DateTimeImmutable($dateStr) : null;

            $out[] = [
                'title' => trim($title) ?: '(no title)',
                'link' => $link,
                'source' => $sourceName,
                'published_at' => $date,
                'summary' => $desc ? strip_tags($desc) : null,
            ];
        }
        return $out;
    }

    protected function normalizeAtomEntries($entries, array $ns, string $sourceName): array
    {
        $out = [];
        $count = 0;

        foreach ($entries as $entry) {
            if ($count >= $this->perFeedLimit) break;
            $count++;

            $title = (string)($entry->title ?? '(no title)');
            $link = '';
            if (isset($entry->link)) {
                foreach ($entry->link as $l) {
                    $attrs = $l->attributes();
                    if (!empty($attrs['href'])) {
                        $link = (string)$attrs['href'];
                        break;
                    }
                }
            }
            $dateStr = (string)($entry->updated ?? $entry->published ?? '');
            $summaryNode = $entry->summary ?? $entry->content ?? null;
            $summary = $summaryNode ? (string)$summaryNode : null;

            $date = $dateStr ? new \DateTimeImmutable($dateStr) : null;

            $out[] = [
                'title' => trim($title) ?: '(no title)',
                'link' => $link,
                'source' => $sourceName,
                'published_at' => $date,
                'summary' => $summary ? strip_tags($summary) : null,
            ];
        }
        return $out;
    }
}
