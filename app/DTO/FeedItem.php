<?php
declare(strict_types=1);

namespace App\DTO;

use Carbon\CarbonImmutable;

final class FeedItem
{
    public function __construct(
        public string $title,
        public string $link,
        public string $source,
        public ?Carbon\CarbonImmutable $publishedAt = null,
        public ?string $summary = null,
    ) {
    }

    public function toArray(): array
    {
        return [
            'title' => $this->title,
            'link' => $this->link,
            'source' => $this->source,
            'published_at' => $this->publishedAt,
            'summary' => $this->summary,
        ];
    }
}
