<?php

namespace App\Services\Streaming;

final class PreflightResult
{
    public function __construct(
        public readonly bool $allowed,
        public readonly ?string $reason = null,
        public readonly ?string $code = null,
    ) {}

    public static function allow(): self
    {
        return new self(true);
    }

    public static function deny(string $reason, string $code): self
    {
        return new self(false, $reason, $code);
    }
}
